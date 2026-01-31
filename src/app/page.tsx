'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
      const apiPath = process.env.NEXT_PUBLIC_BASE_PATH || '/bomb-box-game';
      const res = await fetch(`${apiPath}/api/rooms?code=${code}`);
      if (res.ok) {
        const data = await res.json();

        // すでにゲーム中または終了している場合は、
        // 復帰（Reconnection）画面を表示するために直接ルームへ飛ばす
        if (data.status === 'playing' || data.status === 'finished') {
          router.push(`/room/${data.roomCode}`);
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
      // APIコールのパスを修正（basePath対応）
      const apiPath = process.env.NEXT_PUBLIC_BASE_PATH || '/bomb-box-game';
      const res = await fetch(`${apiPath}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ルームの作成に失敗しました');
      }

      // セッションストレージにプレイヤーIDを保存
      sessionStorage.setItem('playerId', data.playerId);
      sessionStorage.setItem('playerName', playerName.trim());

      router.push(`/room/${data.roomCode}`);
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
      // APIコールのパスを修正（basePath対応）
      const apiPath = process.env.NEXT_PUBLIC_BASE_PATH || '/bomb-box-game';
      const res = await fetch(`${apiPath}/api/rooms`, {
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

      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      {/* 背景エフェクト */}
      <div className={styles.bgEffect}>
        <div className={styles.electricLine} />
        <div className={styles.electricLine} />
        <div className={styles.electricLine} />
      </div>

      <div className={styles.container}>
        {/* ロゴ */}
        <div className={styles.logo}>
          <h1 className={styles.title}>
            <span className={styles.bolt}>💣</span>
            爆弾箱ゲーム
            <span className={styles.bolt}>💥</span>
          </h1>
          <p className={styles.subtitle}>オンライン対戦爆発心理戦</p>
        </div>

        {/* メニュー */}
        {mode === 'menu' && (
          <div className={styles.menu}>
            <button
              className={`btn btn-primary ${styles.menuButton}`}
              onClick={() => setMode('create')}
            >
              ルームを作成
            </button>
            <button
              className={`btn btn-secondary ${styles.menuButton}`}
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
                戻る
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
                戻る
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
          <h3 className={styles.rulesTitle}>遊び方</h3>
          <ul className={styles.rulesList}>
            <li>2人対戦の心理戦ゲーム</li>
            <li>「仕掛け人」が1つの箱に爆弾をセット</li>
            <li>「解除役」が開ける箱を選ぶ</li>
            <li>セーフなら箱の番号分の得点を獲得</li>
            <li>爆発したら得点リセット...</li>
            <li>40点達成か、相手を3回爆発させれば勝利！</li>
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
