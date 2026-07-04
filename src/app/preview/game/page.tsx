'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import GameBoard from '@/components/GameBoard/GameBoard';
import { GameState, Player, ChatMessage, GamePhase } from '@/types/game';
import { createInitialChairs } from '@/lib/gameLogic';
import styles from '../preview.module.css';

const PLAYER1: Player = {
    id: 'p1',
    name: 'キラリン',
    avatar: 'kirarin',
    playerNumber: 1,
    score: 23,
    shockCount: 1,
};

const PLAYER2: Player = {
    id: 'p2',
    name: 'ボニュ',
    avatar: 'ponyu',
    playerNumber: 2,
    score: 15,
    shockCount: 2,
};

type Viewer = 'p1' | 'p2';

type Scenario =
    | 'setting_trap'
    | 'selecting_chair'
    | 'confirming'
    | 'revealing_safe'
    | 'revealing_boom'
    | 'game_over_p1_win';

const SCENARIO_LIST: Scenario[] = [
    'setting_trap', 'selecting_chair', 'confirming', 'revealing_safe', 'revealing_boom', 'game_over_p1_win'
];

const scenarioConfig: Record<Scenario, { phase: GamePhase; trapped: number | null; selected: number | null; isSafe?: boolean }> = {
    setting_trap:        { phase: 'setting_trap',    trapped: null,  selected: null },
    selecting_chair:     { phase: 'selecting_chair', trapped: 5,     selected: 2 },
    confirming:          { phase: 'confirming',      trapped: 5,     selected: 12 },
    revealing_safe:      { phase: 'revealing',       trapped: 5,     selected: 12, isSafe: true },
    revealing_boom:      { phase: 'revealing',       trapped: 5,     selected: 5,  isSafe: false },
    game_over_p1_win:    { phase: 'game_over',       trapped: null,  selected: null },
};

function buildGameState(scenario: Scenario): GameState {
    const cfg = scenarioConfig[scenario];
    const chairs = createInitialChairs();
    chairs[2].isRemoved = true;
    chairs[7].isRemoved = true;

    if (cfg.trapped) {
        const c = chairs.find(ch => ch.id === cfg.trapped);
        if (c) c.isTrapped = true;
    }

    return {
        id: 'mock-game',
        roomId: 'mock-room',
        chairs,
        player1Score: PLAYER1.score,
        player2Score: PLAYER2.score,
        player1Shocks: PLAYER1.shockCount,
        player2Shocks: PLAYER2.shockCount,
        currentRound: 7,
        isHalfFront: true,
        phase: cfg.phase,
        currentSwitcherId: PLAYER1.id,
        currentSitterId: PLAYER2.id,
        trappedChair: cfg.trapped,
        selectedChair: cfg.selected,
        winner: scenario === 'game_over_p1_win' ? PLAYER1.id : null,
        winReason: scenario === 'game_over_p1_win' ? 'score' : null,
        updatedAt: new Date().toISOString(),
    };
}

const MOCK_MESSAGES: ChatMessage[] = [
    { id: 'm1', roomId: 'mock-room', playerId: PLAYER1.id, playerName: PLAYER1.name, message: 'よろしく〜！', createdAt: new Date().toISOString() },
    { id: 'm2', roomId: 'mock-room', playerId: PLAYER2.id, playerName: PLAYER2.name, message: 'いくぞ〜', createdAt: new Date().toISOString() },
];

function isScenario(v: string | null): v is Scenario {
    return !!v && (SCENARIO_LIST as string[]).includes(v);
}

function GamePreviewInner() {
    const router = useRouter();
    const params = useSearchParams();

    const initialScenario: Scenario = isScenario(params.get('scenario')) ? params.get('scenario') as Scenario : 'setting_trap';
    const initialViewer: Viewer = params.get('viewer') === 'p1' ? 'p1' : 'p2';

    const [scenario, setScenario] = useState<Scenario>(initialScenario);
    const [viewer, setViewer] = useState<Viewer>(initialViewer);
    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
    const [collapsed, setCollapsed] = useState(false);

    const updateUrl = (s: Scenario, v: Viewer) => {
        const next = new URLSearchParams();
        next.set('scenario', s);
        next.set('viewer', v);
        router.replace(`/preview/game?${next.toString()}`);
    };

    const baseState = buildGameState(scenario);
    const currentPlayerId = viewer === 'p1' ? PLAYER1.id : PLAYER2.id;

    return (
        <div className={styles.previewWrap}>
            {collapsed ? (
                <button
                    className={styles.debugMini}
                    onClick={() => setCollapsed(false)}
                    aria-label="Open debug panel"
                >⚙</button>
            ) : (
                <div className={styles.debugPanel}>
                    <div className={styles.debugRow}>
                        <div className={styles.debugTitle}>BOXBOM Preview</div>
                        <Link href="/preview" className={styles.debugBackBtn}>← 一覧へ</Link>
                        <button
                            className={styles.debugCollapseBtn}
                            onClick={() => setCollapsed(true)}
                            aria-label="Collapse"
                        >–</button>
                    </div>
                    <div className={styles.debugRow}>
                        <span className={styles.debugLabel}>Scenario:</span>
                        <select
                            value={scenario}
                            onChange={e => {
                                const next = e.target.value as Scenario;
                                setScenario(next);
                                updateUrl(next, viewer);
                            }}
                            className={styles.debugSelect}
                        >
                            <option value="setting_trap">① 爆弾セット中（P1=仕掛け人）</option>
                            <option value="selecting_chair">② 箱選択中（P2=解除役）</option>
                            <option value="confirming">③ 確定中</option>
                            <option value="revealing_safe">④ 結果: SAFE!</option>
                            <option value="revealing_boom">⑤ 結果: BOOM!!</option>
                            <option value="game_over_p1_win">⑥ ゲーム終了 (P1勝利)</option>
                        </select>
                    </div>
                    <div className={styles.debugRow}>
                        <span className={styles.debugLabel}>Viewer:</span>
                        <button
                            className={`${styles.debugBtn} ${viewer === 'p1' ? styles.debugBtnOn : ''}`}
                            onClick={() => { setViewer('p1'); updateUrl(scenario, 'p1'); }}
                        >P1 キラリン</button>
                        <button
                            className={`${styles.debugBtn} ${viewer === 'p2' ? styles.debugBtnOn : ''}`}
                            onClick={() => { setViewer('p2'); updateUrl(scenario, 'p2'); }}
                        >P2 ボニュ</button>
                    </div>
                </div>
            )}

            <GameBoard
                key={`${scenario}-${viewer}`}
                gameState={baseState}
                player1={PLAYER1}
                player2={PLAYER2}
                currentPlayerId={currentPlayerId}
                autoAdvanceReveal={false}
                messages={messages}
                onSetTrap={() => { /* noop */ }}
                onSelectChair={() => { /* noop */ }}
                onConfirmSelection={() => { /* noop */ }}
                onNextRound={() => { /* noop */ }}
                onSendMessage={(msg) => setMessages(m => [...m, {
                    id: `local-${Date.now()}`,
                    roomId: 'mock-room',
                    playerId: currentPlayerId,
                    playerName: viewer === 'p1' ? PLAYER1.name : PLAYER2.name,
                    message: msg,
                    createdAt: new Date().toISOString(),
                }])}
                onBackToHome={() => { /* noop */ }}
            />
        </div>
    );
}

export default function GamePreviewPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24, color: '#fff' }}>Loading…</div>}>
            <GamePreviewInner />
        </Suspense>
    );
}
