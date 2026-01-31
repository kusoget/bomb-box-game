'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/game';
import styles from './Chat.module.css';

interface ChatProps {
    messages: ChatMessage[];
    currentPlayerId: string;
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    embedded?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}

export default function Chat({
    messages,
    currentPlayerId,
    onSendMessage,
    disabled = false,
    embedded = false,
    onOpenChange,
}: ChatProps) {
    // embedded mode starts open, floating mode starts closed
    const [isOpen, setIsOpen] = useState(embedded);
    const [unreadCount, setUnreadCount] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(messages.length);

    // 親コンポーネントにopen状態を通知
    useEffect(() => {
        onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    // 新しいメッセージが来たらスクロール & 通知 & 読み上げ
    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            // 最新のメッセージを取得
            const newMessage = messages[messages.length - 1];

            // スクロール処理
            if (isOpen) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                setUnreadCount(prev => prev + 1);
            }

            // 読み上げ処理（デスクトップはembedded、モバイルはfloatingで読み上げ）
            if (newMessage && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                const isMobile = window.innerWidth <= 900;
                // embedded=true → デスクトップ(isMobile=false)で読み上げ
                // embedded=false → モバイル(isMobile=true)で読み上げ
                const shouldSpeak = embedded ? !isMobile : isMobile;

                if (shouldSpeak) {
                    const utterance = new SpeechSynthesisUtterance(newMessage.message);
                    utterance.lang = 'ja-JP';
                    utterance.rate = 1.1;
                    utterance.pitch = 1.0;
                    utterance.volume = 0.8;
                    window.speechSynthesis.speak(utterance);
                }
            }
        }
        prevMessagesLength.current = messages.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length, isOpen]);

    // 開いたときに未読をリセット
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }, 100);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && !disabled) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={embedded ? styles.embeddedWrapper : styles.floatingWrapper}>
            {isOpen && (
                <div className={styles.chatContainer}>
                    <div className={styles.chatHeader}>
                        <div className={styles.headerLeft}>
                            <span className={styles.chatIcon}>💬</span>
                            <span className={styles.chatTitle}>Chat</span>
                        </div>
                        <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                            ✕
                        </button>
                    </div>

                    <div className={styles.messagesContainer}>
                        {messages.length === 0 ? (
                            <div className={styles.emptyState}>
                                メッセージがありません<br />
                                対戦相手とチャットできます
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={`${embedded ? 'e' : 'f'}-${msg.id}`}
                                    className={`
                ${styles.message}
                ${msg.playerId === currentPlayerId ? styles.own : ''}
                ${msg.playerId === 'system' ? styles.system : ''}
              `}
                                >
                                    {msg.playerId !== 'system' && (
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageSender}>{msg.playerName}</span>
                                            <span className={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                                        </div>
                                    )}
                                    <div className={styles.messageContent}>{msg.message}</div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className={styles.inputContainer} onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className={styles.chatInput}
                            placeholder="メッセージ..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={disabled}
                            maxLength={200}
                        />
                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={disabled || !inputValue.trim()}
                        >
                            送信
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle button only when chat is closed (floating mode only) */}
            {!embedded && !isOpen && (
                <button
                    className={styles.toggleButton}
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Chat"
                >
                    💬
                    {unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{unreadCount}</span>
                    )}
                </button>
            )}
        </div>
    );
}
