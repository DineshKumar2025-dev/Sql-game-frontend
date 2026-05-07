const API_BASE = import.meta.env.VITE_API_URL;

function getStoredUserId() {
    try {
        const raw = localStorage.getItem('auth_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        const id = user?.user_id ?? user?.id;
        return id != null ? Number(id) : null;
    } catch {
        return null;
    }
}

async function sub_level(level) {
    const levelNum = Number(level);
    const user_id = getStoredUserId();

    const response = await fetch(
        `${API_BASE}/api/levels/level_sublevel?level=${encodeURIComponent(levelNum)}&user_id=${encodeURIComponent(user_id)}`,
        { method: 'GET' }
    );

    if (!response.ok) {
        throw new Error(`Failed to get sublevel: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data)
    return data.level_id;
}

async function get_sql_query(level) {
    // Sublevel id string (e.g. l11) — must match verifycode / DB level_id, not a numeric row id.
    const levelKey = level == null ? '' : String(level).trim();
    const user_id = getStoredUserId();
    const response = await fetch(
        `${API_BASE}/api/levels/sublevel_query?level=${encodeURIComponent(levelKey)}&user_id=${encodeURIComponent(user_id)}`,
        { method: 'GET' }
    );
    if (!response.ok) {
        throw new Error(`Failed to get sublevel: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.query;
}

export default sub_level;
export { get_sql_query };