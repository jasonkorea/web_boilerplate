export function setupWebSocket(room, username, chatDiv) {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${location.host}/ws?room=${room}&user=${username}&t=${Date.now()}`;
    const socket = new WebSocket(url);

    // ✅ 중복 방지를 위해 리스너 재설정
    socket.onmessage = null;

    socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        const p = document.createElement('p');

        if (data.type === 'system') {
            p.textContent = `[시스템] ${data.text}`;
            p.style.color = 'gray';
        } else if (data.type === 'chat') {
            p.textContent = `${data.user}: ${data.text}`;
        } else if (data.type === 'history') {
            p.textContent = `${data.user} ${data.text}`;
            p.style.color = '#888';
        }

        chatDiv.appendChild(p);
        chatDiv.scrollTop = chatDiv.scrollHeight;
    });

    return socket;
}
