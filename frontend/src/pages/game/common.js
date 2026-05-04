const API_BASE = import.meta.env.VITE_API_URL;

async function sub_level(level) {
    const levelNum = Number(level);
    const user_id = localStorage.getItem('user_id'); // read fresh each call

    const response = await fetch(
        `${API_BASE}/api/levels/level_sublevel?level=${encodeURIComponent(levelNum)}&user_id=${encodeURIComponent(user_id)}`,
        { method: 'GET' }
    );

    if (!response.ok) {
        throw new Error(`Failed to get sublevel: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data.level_id);
    return data.level_id;
}

export default sub_level;