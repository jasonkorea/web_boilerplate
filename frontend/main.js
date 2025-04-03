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
        if (!newRoom) return;
        if (!currentUser) {
            console.warn('로그인하지 않은 상태에서는 방 연결이 제한됩니다.');
            return;
        }
        if (newRoom === currentRoom) return;

        currentRoom = newRoom; // ✅ 먼저 currentRoom 갱신

        if (socket && socket.readyState === WebSocket.OPEN) {
            console.log(`🛑 기존 WebSocket 종료 (${currentRoom})`);
            socket.onclose = () => {
                console.log(`☑️ WebSocket 종료 완료 (${currentRoom})`);
                chatDiv.innerHTML = '';
                // const info = document.createElement('p');
                // info.textContent = `🔄 '${newRoom}' 방에 입장하였습니다.`;
                // info.style.color = '#666';
                // chatDiv.appendChild(info);

                console.log(`🔌 '${newRoom}' 방에 WebSocket 연결됨`);
                socket = setupWebSocket(newRoom, currentUser.displayName, chatDiv);
            };
            socket.close();
        }
    });





    // 메시지 전송
    sendBtn.addEventListener('click', () => {
        const msg = messageInput.value.trim();

        if (!currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!socket) {
            alert('방을 먼저 선택하세요.');
            console.warn('❌ WebSocket 연결 없음');
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

    deleteRoomBtn.addEventListener('click', async () => {
        const name = roomSelect.value;
        if (!currentUser) return alert('로그인이 필요합니다.');
        if (!name) return alert('삭제할 방을 선택하세요.');

        const confirmed = confirm(`'${name}' 방을 정말 삭제하시겠습니까?`);
        if (!confirmed) return;

        const res = await fetch(`/rooms/${name}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) {
            await reloadRooms();
            socket = null; // 기존 WebSocket 연결 해제
            chatDiv.innerHTML = ''; // 채팅창 초기화
            alert(`방 '${name}'이 삭제되었습니다.`);

            // ✅ 나머지 방이 존재하면 자동 선택 및 WebSocket 연결
            if (roomSelect.options.length > 0 && currentUser) {
                const newRoom = roomSelect.options[0].value;
                roomSelect.value = newRoom;

                // 방 선택 후 WebSocket 연결
                console.log(`🔌 새로운 WebSocket 연결 (${newRoom})`);
                socket = setupWebSocket(newRoom, currentUser.displayName, chatDiv); // 새 방에 연결
                currentRoom = newRoom;

                // 자동으로 입장 메시지 표시
                const info = document.createElement('p');
                info.textContent = `🔄 '${newRoom}' 방에 자동 연결되었습니다.`;
                info.style.color = '#666';
                chatDiv.appendChild(info);
            }
        }
    });

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

            // ✅ 채팅창 초기화
            chatDiv.innerHTML = ''; // 새 방 선택 시 채팅 내용 초기화

            // 새로 생성된 방을 자동으로 선택하고 WebSocket 연결
            const newRoom = roomSelect.options[roomSelect.options.length - 1].value;
            roomSelect.value = newRoom;

            console.log(`🔌 새로 생성된 방 (${newRoom})에 WebSocket 연결`);
            socket = setupWebSocket(newRoom, currentUser.displayName, chatDiv); // 새 방에 WebSocket 연결
            currentRoom = newRoom;

            alert(`방 '${name}'이 생성되었습니다.`);
        } else {
            const err = await res.json();
            alert(err.error || '방 생성 실패');
        }
    });

});
