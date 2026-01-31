import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

// ブラウザ用のシングルトン
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
    if (!browserClient) {
        browserClient = createClient(supabaseUrl, supabaseAnonKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        });
    }
    return browserClient;
}
