import React from 'react';
import styles from './Toast.module.css';

interface ToastProps {
    message: string;
    isVisible: boolean;
}

export default function Toast({ message, isVisible }: ToastProps) {
    if (!isVisible) return null;

    return (
        <div className={styles.toast}>
            {message}
        </div>
    );
}
