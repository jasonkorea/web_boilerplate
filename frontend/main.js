import { setupWebSocket } from './websocket.js';

let currentRoom = null;

document.addEventListener('DOMContentLoaded', async () => {
    const roomSelect = document.getElementById('roomSelect');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('message');
    const chatDiv = document.getElementById('chat');
    const sendBtn = document.getElementById('send');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userDisplay = document.getElementById('userDisplay');
    const newRoomInput = document.getElementById('newRoomInput');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const deleteRoomBtn = document.getElementById('deleteRoomBtn');

    let socket = null;
    let currentUser = null;

    console.log('📦 페이지 로딩 완료');

    // 로그인 상태 확인
    try {
        const userRes = await fetch('/auth/user', { credentials: 'include' });
        if (userRes.ok) {
            const data = await userRes.json();
            currentUser = data.user;
            usernameInput.value = currentUser.displayName;
            usernameInput.disabled = true;
            userDisplay.textContent = `👤 ${currentUser.displayName}`;
            loginBtn.style.display = 'none';
            logoutBtn.style.display = '';
            console.log('✅ 로그인 사용자:', currentUser.displayName);
        } else {
            console.log('❌ 로그인되지 않음');
        }
    } catch (err) {
        console.error('로그인 확인 오류:', err);
    }

    loginBtn.addEventListener('click', () => {
        window.location.href = '/auth/google';
    });

    logoutBtn.addEventListener('click', () => {
        window.location.href = '/auth/logout';
    });

    // 방 목록 새로고침
    async function reloadRooms() {
        roomSelect.innerHTML = '';
        const res = await fetch('/rooms');
        const rooms = await res.json();
        rooms.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            roomSelect.appendChild(option);
        });
        console.log('📃 방 목록 로딩 완료:', rooms);
    }

    await reloadRooms();

    // ✅ 자동 연결 (최초 로드 시 첫 방 선택 & WebSocket 연결)
    if (roomSelect.options.length > 0 && currentUser) {
        const firstRoom = roomSelect.options[0].value;
        roomSelect.value = firstRoom;
        console.log(`🚀 초기 방 자동 연결: ${firstRoom}`);
        socket = setupWebSocket(firstRoom, currentUser.displayName, chatDiv);
    }

    // 방 선택 → WebSocket 연결
    // 변경된 roomSelect change 이벤트 핸들러
    roomSelect.addEventListener('change', () => {
        const newRoom = roomSelect.value;
        if (!newRoom || !currentUser) return;
        if (newRoom === currentRoom) return;

        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log(`🛑 기존 WebSocket 종료 (${currentRoom})`);

            // ✅ 이전 소켓 닫고, onclose에서 새 연결 수행
            socket.onclose = () => {
                console.log(`☑️ WebSocket 종료 완료 (${currentRoom})`);

                // 채팅창 초기화 및 안내 메시지
                chatDiv.innerHTML = '';
                const info = document.createElement('p');
                info.textContent = `🔄 '${newRoom}' 방에 입장하였습니다.`;
                info.style.color = '#666';
                chatDiv.appendChild(info);

                console.log(`🔌 새로운 WebSocket 연결 (${newRoom})`);
                socket = setupWebSocket(newRoom, currentUser.displayName, chatDiv);
                currentRoom = newRoom;
            };

            socket.close();
        } else {
            // ✅ 기존 소켓이 없거나 이미 닫힘
            chatDiv.innerHTML = '';
            const info = document.createElement('p');
            info.textContent = `🔄 '${newRoom}' 방에 입장하였습니다.`;
            info.style.color = '#666';
            chatDiv.appendChild(info);

            console.log(`🔌 새로운 WebSocket 연결 (${newRoom})`);
            socket = setupWebSocket(newRoom, currentUser.displayName, chatDiv);
            currentRoom = newRoom;
        }
    });




    // 메시지 전송
    sendBtn.addEventListener('click', () => {
        const msg = messageInput.value.trim();
        if (!socket) {
            alert('방을 먼저 선택하세요.');
            console.warn('❌ WebSocket이 아직 연결되지 않음');
            return;
        }
        if (!msg) return;
        console.log('📤 메시지 전송:', msg);
        socket.send(JSON.stringify({ type: 'message', text: msg }));
        messageInput.value = '';
    });

    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendBtn.click();
        }
    });

    // 방 생성
    createRoomBtn.addEventListener('click', async () => {
        const name = newRoomInput.value.trim();
        if (!currentUser) return alert('로그인이 필요합니다.');
        if (!name) return alert('방 이름을 입력하세요.');

        const res = await fetch('/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });

        if (res.ok) {
            newRoomInput.value = '';
            await reloadRooms();
            roomSelect.value = name;

            // 직접 WebSocket 연결
            console.log(`🆕 방 '${name}' 생성됨. WebSocket 연결 시작`);
            socket = setupWebSocket(name, currentUser.displayName, chatDiv);

            alert(`방 '${name}'이 생성되어 연결되었습니다.`);
        } else {
            const err = await res.json();
            alert(err.error || '방 생성 실패');
        }
    });

    // 방 삭제
    deleteRoomBtn.addEventListener('click', async () => {
        const name = roomSelect.value;
        if (!currentUser) return alert('로그인이 필요합니다.');
        if (!name) return alert('삭제할 방을 선택하세요.');
        const confirmed = confirm(`'${name}' 방을 정말 삭제하시겠습니까?`);
        if (!confirmed) return;

        const res = await fetch(`/rooms/${name}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) {
            await reloadRooms();
            socket = null;
            chatDiv.innerHTML = '';
            alert(`방 '${name}'이 삭제되었습니다.`);
        } else {
            alert('방 삭제 실패');
        }
    });
});
