export const API_BASE = 'https://lobpoop-core.miladyxx333.workers.dev';

export const apiFetch = async (path: string, options: RequestInit = {}) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

    // Ensure we identify ourselves properly
    const nodeId = localStorage.getItem('lob_node_id') || 'agent-neo';

    const headers = {
        'Content-Type': 'application/json',
        'X-Lob-Peer-ID': nodeId,
        ...(options.headers || {})
    } as HeadersInit;

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            throw new Error(json.message || json.error || `Error ${res.status}`);
        } catch (e) {
            throw new Error(text || `Error ${res.status}`);
        }
    }

    // Return JSON by default unless it's a 204 or specialized call
    if (res.status === 204) return null;
    return res.json();
};

// SWR fetcher wrapper
export const swrFetcher = (path: string) => apiFetch(path);
