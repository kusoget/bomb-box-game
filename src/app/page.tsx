'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { apiUrl, roomPath } from '@/lib/api';
import { asset } from '@/lib/assets';
import styles from './page.module.css';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'invite'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 対戦ルール（作成者が設定）
  const [targetScore, setTargetScore] = useState(40);
  const [suddenDeath, setSuddenDeath] = useState(false);

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      fetchHostInfo(joinCode.toUpperCase());
    }
  }, [searchParams]);

  const fetchHostInfo = async (code: string) => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl(`/api/rooms?code=${code}`));
      if (res.ok) {
        const data = await res.json();

        // すでにゲーム中または終了している場合は、
        // 復帰（Reconnection）画面を表示するために直接ルームへ飛ばす
        if (data.status === 'playing' || data.status === 'finished') {
          router.push(roomPath(data.roomCode));
          return;
        }

        setHostName(data.hostName);
        setMode('invite');
      } else {
        // ルームが見つからない場合は通常の参加画面へ
        setMode('join');
      }
    } catch {
      setMode('join');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('名前を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          rules: {
            targetScore,
            maxShocks: suddenDeath ? 1 : 3,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ルームの作成に失敗しました');
      }

      // セッションストレージにプレイヤーIDを保存
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', playerName.trim());

      router.push(roomPath(data.roomCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('名前を入力してください');
      return;
    }
    if (!roomCode.trim()) {
      setError('ルームコードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/rooms'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          roomCode: roomCode.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ルームへの参加に失敗しました');
      }

      // セッションストレージにプレイヤーIDを保存
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', playerName.trim());

      router.push(roomPath(data.roomCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <main className={`${styles.main} boxbom-home-screen`}>
      <div className={styles.container}>
        {/* ロゴ */}
        <div className={styles.logo}>
          <h1 className={styles.title}>
            <Image src={asset('/images/boxbom/logo-v3.png')} alt="BOXBOM" width={515} height={191} className={styles.titleLogo} priority unoptimized />
          </h1>
        </div>

        {/* メニュー */}
        {mode === 'menu' && (
          <div className={styles.menu}>
            <button
              className={`btn ${styles.menuButton} ${styles.menuButtonPrimary}`}
              onClick={() => setMode('create')}
            >
              ルームを作成
            </button>
            <button
              className={`btn ${styles.menuButton} ${styles.menuButtonSecondary}`}
              onClick={() => setMode('join')}
            >
              ルームに参加
            </button>
          </div>
        )}

        {/* ルーム作成 */}
        {mode === 'create' && (
          <div className={`card ${styles.formCard}`}>
            <h2 className={styles.formTitle}>ルームを作成</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>あなたの名前</label>
              <input
                type="text"
                className={`input ${styles.input}`}
                placeholder="名前を入力..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                disabled={loading}
              />
            </div>

            {/* ルール設定 */}
            <div className={styles.formGroup}>
              <label className={styles.label}>目標スコア</label>
              <div className={styles.ruleOptions}>
                {[20, 40, 60].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`${styles.ruleOption} ${targetScore === score ? styles.ruleOptionActive : ''}`}
                    onClick={() => setTargetScore(score)}
                    disabled={loading}
                  >
                    {score}点
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>一撃必殺モード</label>
              <div className={styles.ruleOptions}>
                <button
                  type="button"
                  className={`${styles.ruleOption} ${!suddenDeath ? styles.ruleOptionActive : ''}`}
                  onClick={() => setSuddenDeath(false)}
                  disabled={loading}
                >
                  OFF（3回で負け）
                </button>
                <button
                  type="button"
                  className={`${styles.ruleOption} ${suddenDeath ? styles.ruleOptionActive : ''}`}
                  onClick={() => setSuddenDeath(true)}
                  disabled={loading}
                >
                  ON（1回で負け）
                </button>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formActions}>
              <button
                className={`btn btn-primary ${styles.submitButton}`}
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {loading ? '作成中...' : '作成する'}
              </button>
              <button
                className={styles.backButton}
                onClick={() => { setMode('menu'); setError(''); }}
                disabled={loading}
              >
                ← メニューに戻る
              </button>
            </div>
          </div>
        )}

        {/* ルーム参加 (通常) */}
        {mode === 'join' && (
          <div className={`card ${styles.formCard}`}>
            <h2 className={styles.formTitle}>ルームに参加</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>あなたの名前</label>
              <input
                type="text"
                className={`input ${styles.input}`}
                placeholder="名前を入力..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                disabled={loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>ルームコード</label>
              <input
                type="text"
                className={`input ${styles.input} ${styles.roomCodeInput}`}
                placeholder="XXXXXX"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                disabled={loading}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formActions}>
              <button
                className={`btn btn-primary ${styles.submitButton}`}
                onClick={handleJoinRoom}
                disabled={loading}
              >
                {loading ? '参加中...' : '参加する'}
              </button>
              <button
                className={styles.backButton}
                onClick={() => { setMode('menu'); setError(''); }}
                disabled={loading}
              >
                ← メニューに戻る
              </button>
            </div>
          </div>
        )}

        {/* 招待参加 (URL経由) */}
        {mode === 'invite' && (
          <div className={`card ${styles.formCard}`}>
            <div className={styles.inviteMessage}>
              <span className={styles.hostName}>{hostName}</span>
              さんから<br />
              <span className={styles.inviteTitle}>爆弾箱ゲームに招待されました</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>ニックネーム</label>
              <input
                type="text"
                className={`input ${styles.input}`}
                placeholder="名前を入力..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formActions}>
              <button
                className={`btn btn-primary ${styles.submitButton}`}
                onClick={handleJoinRoom}
                disabled={loading}
              >
                {loading ? '参加する' : '参加する'}
              </button>
            </div>
          </div>
        )}

        {/* ルール説明 */}
        <div className={styles.rules}>
          <h3 className={styles.rulesTitle}>HOW TO PLAY</h3>
          <ul className={styles.rulesList}>
            <li>
              <span className={styles.ruleIcon}><Image src={asset('/images/boxbom/bomb-mark.png')} alt="" width={38} height={38} unoptimized /></span>
              <span>相手が12個の箱のひとつに爆弾を仕掛ける</span>
            </li>
            <li>
              <span className={styles.ruleIcon}><Image src={asset('/images/boxbom/box_on.png')} alt="" width={38} height={38} unoptimized /></span>
              <span>箱を選ぶ。セーフなら番号分を獲得、爆発なら得点は0</span>
            </li>
            <li>
              <span className={styles.ruleIcon} aria-hidden="true">
                <svg viewBox="0 0 32 32" role="presentation"><path d="M9 4h14v4h5v4c0 5-3.4 8-8 8.8V24h5v4H7v-4h5v-3.2C7.4 20 4 17 4 12V8h5V4Zm0 8H7c0 2.5 1.3 4.1 3.4 4.8A13 13 0 0 1 9 12Zm14 0c0 1.8-.5 3.4-1.4 4.8 2.1-.7 3.4-2.3 3.4-4.8h-2Z" /></svg>
              </span>
              <span>{targetScore}点先取か相手が{suddenDeath ? '1回でも' : '3回'}爆発で勝利。残り1箱なら高得点の勝ち</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
