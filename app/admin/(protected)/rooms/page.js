'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RoomsPage() {
  const pathname = usePathname();
  const [rooms, setRooms] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    start: '',
    end: '',
    startDate: '',
    endDate: '',
    group: '전부',
    capacity: 4,
    remarks: ''
  });
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null); // 모달용
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // 방 생성 모달

  // 새로 추가된 상태
  const [expandedRooms, setExpandedRooms] = useState({}); // Collapse 상태
  const [currentPage, setCurrentPage] = useState(1); // 페이지네이션
  const [roomSearch, setRoomSearch] = useState(''); // 방 검색
  const PAGE_SIZE = 30;

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    setSettings(data.settings);
  };

  const fetchRooms = async () => {
    const res = await fetch('/api/admin/rooms', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    const data = await res.json();
    setRooms(data.rooms || []);
    setSelectedRooms([]);
  };

  const fetchAllParticipants = async () => {
    // 모든 폼의 참가자를 가져옴
    try {
      const formsRes = await fetch('/api/admin/forms');
      const formsData = await formsRes.json();
      const forms = formsData.forms || [];

      console.log('📋 Forms found:', forms.length);

      let allParts = [];
      for (const form of forms) {
        const collectionName = `participants_${form.id}`;
        console.log(`🔍 Fetching from collection: ${collectionName}`);
        const res = await fetch(`/api/admin/participants?collectionName=${collectionName}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        const data = await res.json();
        const participants = data.participants || [];

        // 이름과 전화번호 필드 찾기
        const nameField = form.fields?.find(f => f.type === 'text' && (f.label?.includes('이름') || f.label?.includes('성명')));
        const phoneField = form.fields?.find(f => f.type === 'tel');

        // 참가자 데이터에 name과 phone 속성 추가
        const enrichedParticipants = participants.map(p => ({
          ...p,
          name: nameField ? p[nameField.id] : '이름 없음',
          phone: phoneField ? p[phoneField.id] : '',
          totalPeople: p.totalPeople || 1 // totalPeople이 없으면 기본값 1
        }));

        console.log(`  ✅ Found ${participants.length} participants`);
        console.log(`  📊 Participants with rooms:`, participants.filter(p => p.roomId).length);
        console.log(`  👤 Sample enriched participant:`, enrichedParticipants[0]);
        allParts = [...allParts, ...enrichedParticipants];
      }

      console.log('👥 Total participants:', allParts.length);
      console.log('🏠 Participants with room assignments:', allParts.filter(p => p.roomId).length);
      console.log('🔑 Sample participant with room:', allParts.find(p => p.roomId));

      setAllParticipants(allParts);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      setAllParticipants([]);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRooms();
    fetchAllParticipants();

    // 페이지가 다시 포커스될 때마다 데이터 새로고침
    const handleFocus = () => {
      console.log('🔄 Page focused - refreshing data...');
      fetchRooms();
      fetchAllParticipants();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // pathname이 변경될 때마다 데이터 새로고침
  useEffect(() => {
    if (pathname === '/admin/rooms') {
      console.log('🔄 Navigated to rooms page - refreshing data...');
      fetchRooms();
      fetchAllParticipants();
    }
  }, [pathname]);

  const createRooms = async (e) => {
    e.preventDefault();
    await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ start: '', end: '', startDate: '', endDate: '', group: '전부', capacity: 4, remarks: '' });
    setShowCreateModal(false);
    fetchRooms();
  };

  const deleteSelected = async () => {
    if (selectedRooms.length === 0) return;
    if (!confirm(`선택한 ${selectedRooms.length}개 방을 삭제하시겠습니까?`)) return;

    await fetch('/api/admin/rooms', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomIds: selectedRooms }),
    });
    fetchRooms();
  };

  const toggleSelect = (id) => {
    setSelectedRooms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map(r => r.id));
    }
  };

  // 특정 방(날짜별)에 배정된 참가자들
  const getParticipantsForRoom = (roomId, roomDate) => {
    console.log('🔍 getParticipantsForRoom called:', { roomId, roomDate });
    console.log('📊 Total participants:', allParticipants.length);

    // roomDate가 제공된 경우: 해당 날짜에 이 방에 배정된 참가자 찾기
    if (roomDate) {
      // 배정 정보가 있는 참가자만 필터링해서 확인
      const participantsWithAssignments = allParticipants.filter(p => p.roomAssignments && Object.keys(p.roomAssignments).length > 0);
      console.log('👥 Participants with room assignments:', participantsWithAssignments.length);

      if (participantsWithAssignments.length > 0) {
        console.log('📋 Sample participant with assignments:', {
          id: participantsWithAssignments[0].id,
          name: participantsWithAssignments[0].name,
          roomAssignments: participantsWithAssignments[0].roomAssignments
        });
      }

      const filtered = allParticipants.filter(p => {
        if (!p.roomAssignments || typeof p.roomAssignments !== 'object') {
          return false;
        }

        // roomAssignments의 모든 키(날짜)를 순회
        for (const dateKey in p.roomAssignments) {
          const assignment = p.roomAssignments[dateKey];

          // standardDate가 있으면 그것으로 비교, 없으면 한글 날짜로 비교
          const assignmentDate = assignment.standardDate || dateKey;

          console.log(`  🔎 Checking ${p.name || p.id}: dateKey="${dateKey}", standardDate="${assignmentDate}", roomId="${assignment.roomId}" vs target roomDate="${roomDate}", roomId="${roomId}"`);

          // roomDate와 비교 (표준 날짜 형식으로)
          if (assignmentDate === roomDate && assignment.roomId === roomId) {
            console.log(`    ✅ Match found: ${p.name || p.id}`);
            return true;
          }
        }

        return false;
      });

      console.log(`✅ Filtered ${filtered.length} participants for room ${roomId} on ${roomDate}`);
      return filtered;
    }

    // roomDate가 없으면 기존 방식 (하위 호환성)
    const filtered = allParticipants.filter(p => p.roomId === roomId);
    return filtered;
  };

  // 방 번호로 그룹화
  const groupedRooms = {};
  rooms.forEach(room => {
    const roomNum = room.roomNumber || room.name?.replace(/[^\d]/g, '');
    if (!groupedRooms[roomNum]) {
      groupedRooms[roomNum] = [];
    }
    groupedRooms[roomNum].push(room);
  });

  // 방 번호 순으로 정렬
  const sortedRoomNumbers = Object.keys(groupedRooms).sort((a, b) => parseInt(a) - parseInt(b));

  // 검색 필터링
  const filteredRoomNumbers = roomSearch
    ? sortedRoomNumbers.filter(num => num.includes(roomSearch))
    : sortedRoomNumbers;

  // 페이지네이션 적용
  const totalPages = Math.ceil(filteredRoomNumbers.length / PAGE_SIZE);
  const paginatedRoomNumbers = filteredRoomNumbers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Collapse 토글 함수
  const toggleRoomExpand = (roomNum) => {
    setExpandedRooms(prev => ({
      ...prev,
      [roomNum]: !prev[roomNum]
    }));
  };

  // 모든 방 펼치기/접기
  const expandAll = () => {
    const allExpanded = {};
    paginatedRoomNumbers.forEach(num => {
      allExpanded[num] = true;
    });
    setExpandedRooms(allExpanded);
  };

  const collapseAll = () => {
    setExpandedRooms({});
  };

  // 숙박 가능 날짜 목록 (마지막 날 제외)
  const accommodationDates = settings?.dates?.slice(0, -1) || [];

  // 방 상세 정보 보기
  const openRoomDetail = (room) => {
    setSelectedRoom(room);
  };

  const closeRoomDetail = () => {
    setSelectedRoom(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchRooms(),
      fetchAllParticipants()
    ]);
    setIsRefreshing(false);
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">방 관리</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + 방 생성
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
            {isRefreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">방 번호 검색</label>
            <input
              type="text"
              value={roomSearch}
              onChange={(e) => {
                setRoomSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="방 번호 입력..."
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              모두 펼치기
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              모두 접기
            </button>
          </div>
        </div>
      </div>

      {/* 전체 선택 + 삭제 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedRooms.length === rooms.length && rooms.length > 0}
              onChange={toggleSelectAll}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">전체 선택</span>
          </label>
          <span className="text-sm text-gray-600">
            {roomSearch ? `검색 결과: ${filteredRoomNumbers.length}개 방` : `전체 ${sortedRoomNumbers.length}개 방`}
            {totalPages > 1 && ` (페이지 ${currentPage}/${totalPages})`}
          </span>
        </div>

        {selectedRooms.length > 0 && (
          <button
            onClick={deleteSelected}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
          >
            선택한 {selectedRooms.length}개 방 삭제
          </button>
        )}
      </div>

      {/* 방 목록 (방 번호 기준 그룹화 - Collapse 카드) */}
      {rooms.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
          <p className="text-lg">생성된 방이 없습니다.</p>
          <p className="text-sm mt-2">위 폼에서 방을 생성해주세요.</p>
        </div>
      ) : filteredRoomNumbers.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
          <p className="text-lg">검색 결과가 없습니다.</p>
          <p className="text-sm mt-2">다른 방 번호로 검색해보세요.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedRoomNumbers.map(roomNumber => {
              const roomsByDate = groupedRooms[roomNumber];
              // 날짜 순으로 정렬
              roomsByDate.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

              const firstRoom = roomsByDate[0];
              const allRoomIds = roomsByDate.map(r => r.id);
              const allSelected = allRoomIds.every(id => selectedRooms.includes(id));
              const isExpanded = expandedRooms[roomNumber];

              // 총 배정 인원 계산
              const totalAssigned = roomsByDate.reduce((sum, room) => {
                const participants = getParticipantsForRoom(room.id, room.date);
                return sum + participants.reduce((s, p) => s + (p.totalPeople || 0), 0);
              }, 0);

              return (
                <div key={roomNumber} className="bg-white shadow rounded-lg overflow-hidden">
                  {/* 방 번호 헤더 (클릭 시 Collapse) */}
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between cursor-pointer hover:from-blue-700 hover:to-blue-800 transition"
                    onClick={() => toggleRoomExpand(roomNumber)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (allSelected) {
                            setSelectedRooms(prev => prev.filter(id => !allRoomIds.includes(id)));
                          } else {
                            setSelectedRooms(prev => [...new Set([...prev, ...allRoomIds])]);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                      />
                      <h3 className="text-lg font-bold text-white">
                        {roomNumber}호
                      </h3>
                      <span className="text-blue-100 text-sm">
                        {firstRoom.capacity}인실
                        {firstRoom.remarks && ` [${firstRoom.remarks}]`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-blue-100 text-sm">
                        {roomsByDate.length}일 | 총 {totalAssigned}명 배정
                      </span>
                      <span className="text-white text-lg">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* 날짜별 상태 (Collapse 내용) */}
                  {isExpanded && (
                    <div className="p-3 bg-gray-50">
                      <div className="space-y-2">
                        {roomsByDate.map(room => {
                          const participants = getParticipantsForRoom(room.id, room.date);
                          const totalPeople = participants.reduce((sum, p) => sum + (p.totalPeople || 0), 0);
                          const isOverCapacity = totalPeople > room.capacity;
                          const isSelected = selectedRooms.includes(room.id);

                          return (
                            <div
                              key={room.id}
                              className={`border rounded-lg p-3 transition bg-white ${
                                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(room.id)}
                                    className="h-4 w-4"
                                  />
                                  <div>
                                    <div className="font-medium text-gray-900 text-sm">
                                      {room.date}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {totalPeople}/{room.capacity}명
                                      {isOverCapacity && (
                                        <span className="ml-1 text-red-600 font-semibold">초과</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {participants.length > 0 ? (
                                    <div className="text-xs text-gray-700 text-right">
                                      {participants.slice(0, 2).map(p => (
                                        <span key={p.id} className="mr-2">{p.name}</span>
                                      ))}
                                      {participants.length > 2 && (
                                        <span className="text-blue-600">+{participants.length - 2}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}

                                  <button
                                    onClick={() => openRoomDetail(room)}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                                  >
                                    상세
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                처음
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                이전
              </button>
              <span className="px-4 py-1 text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                다음
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                마지막
              </button>
            </div>
          )}
        </>
      )}

      {/* 방 상세 정보 모달 */}
      {selectedRoom && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeRoomDetail}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedRoom.name}</h2>
                <p className="text-sm text-gray-600">{selectedRoom.group} | 정원 {selectedRoom.capacity}명</p>
              </div>
              <button
                onClick={closeRoomDetail}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {getParticipantsForRoom(selectedRoom.id, selectedRoom.date).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>배정된 참가자가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getParticipantsForRoom(selectedRoom.id, selectedRoom.date).map(participant => (
                    <div
                      key={participant.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{participant.name}</h3>
                          <p className="text-sm text-gray-600">{participant.phone}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {participant.totalPeople}명
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">숙박 날짜</p>
                          {participant.accommodationDates && participant.accommodationDates.length > 0 ? (
                            <div className="space-y-1">
                              {participant.accommodationDates.map((date, idx) => (
                                <div key={idx} className="bg-gray-50 px-2 py-1 rounded text-xs">
                                  {date}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic">신청 안함</p>
                          )}
                        </div>

                        <div>
                          <p className="text-gray-600 mb-1">방 타입</p>
                          <p className="font-medium">{participant.roomType || '-'}</p>

                          {participant.extraCounts && (
                            <div className="mt-2">
                              <p className="text-gray-600 mb-1">인원 구성</p>
                              <div className="text-xs space-y-1">
                                <p>성인: {participant.extraCounts.adult || 0}명</p>
                                <p>8세↑: {participant.extraCounts.minor8plus || 0}명</p>
                                <p>8세↓: {participant.extraCounts.minorUnder8 || 0}명</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {participant.accommodationAmount && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">숙박비</span>
                            <span className="font-semibold text-lg text-green-700">
                              {participant.accommodationAmount.total.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 방 생성 모달 */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">방 생성</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={createRooms} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">시작 방번호</label>
                  <input
                    type="number"
                    value={form.start}
                    onChange={(e) => setForm(f => ({ ...f, start: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="예: 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">끝 방번호</label>
                  <input
                    type="number"
                    value={form.end}
                    onChange={(e) => setForm(f => ({ ...f, end: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="예: 110"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">시작 날짜</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">끝 날짜</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">배정 그룹</label>
                  <select
                    value={form.group}
                    onChange={(e) => setForm(f => ({ ...f, group: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option>탈북민</option>
                    <option>목회자</option>
                    <option>평신도</option>
                    <option>전부</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">가용 인원</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm(f => ({ ...f, capacity: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">비고 (방 구분)</label>
                  <select
                    value={form.remarks}
                    onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="">선택 안함</option>
                    <option value="여자방">여자방</option>
                    <option value="남자방">남자방</option>
                    <option value="가족실">가족실</option>
                    <option value="혼합">혼합</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">직접 입력 (선택)</label>
                  <input
                    type="text"
                    value={form.remarks}
                    onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="예: 목회자 가족실"
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-sm text-blue-800">
                <strong>생성될 방:</strong> {
                  form.start && form.end && form.startDate && form.endDate
                    ? (() => {
                        const roomCount = parseInt(form.end) - parseInt(form.start) + 1;
                        const startD = new Date(form.startDate);
                        const endD = new Date(form.endDate);
                        const dayCount = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
                        return `${roomCount}개 방 × ${dayCount}일 = 총 ${roomCount * dayCount}개`;
                      })()
                    : '정보를 입력하세요'
                }
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  방 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
