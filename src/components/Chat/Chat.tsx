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

    // ... (logic) ...

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
