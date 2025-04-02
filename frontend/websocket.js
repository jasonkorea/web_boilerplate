export function setupWebSocket(room, username, chatDiv) {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';

    // ✅ 연결 URL을 항상 새롭게 만들어 캐시/재사용 방지
    const url = `${protocol}://${location.host}/ws?room=${room}&user=${username}&t=${Date.now()}`;
    const socket = new WebSocket(url);

    socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        const p = document.createElement('p');

        if (data.type === 'system') {
            p.textContent = `[시스템] ${data.text}`;
            p.style.color = 'gray';
        } else if (data.type === 'chat') {
            p.textContent = `${data.user}: ${data.text}`;
        } else if (data.type === 'history') {
            p.textContent = `${data.user} (이전): ${data.text}`;
            p.style.color = '#888';
        }

        chatDiv.appendChild(p);
        chatDiv.scrollTop = chatDiv.scrollHeight;
    });

    return socket;
}

