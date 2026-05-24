'use client';

import Link from 'next/link';
import styles from './index.module.css';

type ScreenItem = {
    href: string;
    title: string;
    desc: string;
    accent: string;
};

const GAME_SCENARIOS: ScreenItem[] = [
    { href: '/preview/game?scenario=setting_trap',     title: '① 爆弾セット中',  desc: 'P1=仕掛け人',           accent: '#FF2D55' },
    { href: '/preview/game?scenario=selecting_chair',  title: '② 箱選択中',      desc: 'P2=解除役',             accent: '#9b59b6' },
    { href: '/preview/game?scenario=confirming',       title: '③ 確定中',        desc: '選択を確定',            accent: '#FFC72C' },
    { href: '/preview/game?scenario=revealing_safe',   title: '④ SAFE!',         desc: '結果: セーフ',          accent: '#3DDC97' },
    { href: '/preview/game?scenario=revealing_boom',   title: '⑤ BOOM!!',        desc: '結果: 爆発',            accent: '#FF6B35' },
    { href: '/preview/game?scenario=game_over_p1_win', title: '⑥ ゲーム終了',    desc: 'P1勝利',                accent: '#FF2D55' },
];

const OTHER_SCREENS: ScreenItem[] = [
    { href: '/preview/lobby',    title: 'Lobby',    desc: 'ルーム待機画面',      accent: '#3DDC97' },
    { href: '/preview/roulette', title: 'Roulette', desc: '先攻ルーレット',      accent: '#FFC72C' },
];

export default function PreviewIndexPage() {
    return (
        <div className={styles.wrap}>
            <h1 className={styles.heading}>BOXBOM Preview</h1>
            <p className={styles.lead}>各画面・各シーンに直接ジャンプできます。</p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>GameBoard シナリオ</h2>
                <div className={styles.grid}>
                    {GAME_SCENARIOS.map(s => (
                        <Link key={s.href} href={s.href} className={styles.card} style={{ borderColor: s.accent }}>
                            <div className={styles.cardAccent} style={{ background: s.accent }} />
                            <div className={styles.cardTitle}>{s.title}</div>
                            <div className={styles.cardDesc}>{s.desc}</div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>その他の画面</h2>
                <div className={styles.grid}>
                    {OTHER_SCREENS.map(s => (
                        <Link key={s.href} href={s.href} className={styles.card} style={{ borderColor: s.accent }}>
                            <div className={styles.cardAccent} style={{ background: s.accent }} />
                            <div className={styles.cardTitle}>{s.title}</div>
                            <div className={styles.cardDesc}>{s.desc}</div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
