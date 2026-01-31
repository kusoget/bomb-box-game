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
}

export default function Chat({
    messages,
    currentPlayerId,
    onSendMessage,
    disabled = false,
    embedded = false,
}: ChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(messages.length);

    // 新しいメッセージが来たらスクロール & 通知
    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            if (isOpen) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                setUnreadCount(prev => prev + 1);
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages, isOpen]);

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
                                    key={msg.id}
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

            <button
                className={styles.toggleButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle Chat"
            >
                {isOpen ? '✕' : '💬'}
                {!isOpen && unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{unreadCount}</span>
                )}
            </button>
        </div>
    );
}
