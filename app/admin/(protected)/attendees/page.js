'use client';

import { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

export default function AttendeesPage() {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [groupFilter, setGroupFilter] = useState(''); // 그룹 ID 필터
  const [nameFilter, setNameFilter] = useState(''); // 이름 필터
  const [paymentFilter, setPaymentFilter] = useState(''); // 결제상태 필터 (all/paid/unpaid)
  const [dateFilter, setDateFilter] = useState(''); // 등록일자 필터
  const [roomTypeFilter, setRoomTypeFilter] = useState(''); // 방 타입 필터 (가족실/단체실)
  const [hideFullRooms, setHideFullRooms] = useState(false); // 만실 방 숨기기
  const [roomSortOption, setRoomSortOption] = useState('roomNumber'); // 방 정렬 옵션 (roomNumber/mostSpace/leastSpace)
  const [roomAssignmentCapacityFilter, setRoomAssignmentCapacityFilter] = useState(''); // 방 배정 칼럼의 방 타입 필터 (2인실/4인실/6인실/30인실)

  // 실제 적용된 필터 (검색 버튼 클릭 시 적용)
  const [appliedNameFilter, setAppliedNameFilter] = useState('');
  const [appliedPaymentFilter, setAppliedPaymentFilter] = useState('');
  const [appliedGroupFilter, setAppliedGroupFilter] = useState('');
  const [appliedRoomTypeFilter, setAppliedRoomTypeFilter] = useState('');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [pageSize, setPageSize] = useState(10);

  // 폼 목록 가져오기
  const fetchForms = useCallback(async () => {
    const res = await fetch('/api/admin/forms');
    const data = await res.json();
    setForms(data.forms || []);
    if (data.forms?.length > 0 && !selectedFormId) {
      setSelectedFormId(data.forms[0].id);
    }
  }, [selectedFormId]);

  // Settings 가져오기
  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    setSettings(data.settings);
  }, []);

  // 방 목록 가져오기
  const fetchRooms = useCallback(async () => {
    const res = await fetch('/api/admin/rooms');
    const data = await res.json();
    setRooms(data.rooms || []);
  }, []);

  // 검색 버튼 클릭 핸들러
  const handleSearch = () => {
    setAppliedNameFilter(nameFilter);
    setAppliedPaymentFilter(paymentFilter);
    setAppliedGroupFilter(groupFilter);
    setAppliedRoomTypeFilter(roomTypeFilter);
    fetchParticipants(selectedFormId, 1);
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setNameFilter('');
    setPaymentFilter('');
    setGroupFilter('');
    setRoomTypeFilter('');
    setAppliedNameFilter('');
    setAppliedPaymentFilter('');
    setAppliedGroupFilter('');
    setAppliedRoomTypeFilter('');
    fetchParticipants(selectedFormId, 1);
  };

  // 선택된 폼의 참가자 가져오기
  const fetchParticipants = useCallback(async (formId, page = 1) => {
    if (!formId) return;

    setLoading(true);
    const collectionName = `participants_${formId}`;

    // URL 파라미터 구성
    const params = new URLSearchParams({
      collectionName,
      page: page.toString(),
      limit: pageSize.toString()
    });

    // 적용된 필터 파라미터 추가 (검색 버튼을 누른 후의 값)
    if (appliedPaymentFilter) params.append('paymentStatus', appliedPaymentFilter);
    if (appliedGroupFilter) params.append('groupId', appliedGroupFilter);
    if (appliedRoomTypeFilter) params.append('roomType', appliedRoomTypeFilter);
    if (appliedNameFilter) params.append('searchName', appliedNameFilter);

    const res = await fetch(`/api/admin/participants?${params.toString()}`);
    const data = await res.json();

    console.log('🔍 Attendees Page - Fetched participants:', data.participants?.length);
    console.log('📄 Pagination:', data.pagination);

    // roomNumber가 있는 참가자 확인
    const withRoomNumber = data.participants?.filter(p => p.roomNumber) || [];
    console.log('🚪 Participants with roomNumber:', withRoomNumber.length);

    // roomAssignments가 있는 참가자 확인
    const withAssignments = data.participants?.filter(p => p.roomAssignments && Object.keys(p.roomAssignments).length > 0) || [];
    console.log('🏠 Participants with room assignments:', withAssignments.length);

    if (withRoomNumber.length > 0) {
      console.log('📋 Sample participant with roomNumber:', {
        id: withRoomNumber[0].id,
        roomNumber: withRoomNumber[0].roomNumber,
        roomId: withRoomNumber[0].roomId,
        roomName: withRoomNumber[0].roomName,
        roomAssignments: withRoomNumber[0].roomAssignments,
        accommodationDates: withRoomNumber[0].accommodationDates
      });
    }

    setParticipants(data.participants || []);
    setPagination(data.pagination || null);
    setCurrentPage(page);
    setLoading(false);
  }, [pageSize, appliedPaymentFilter, appliedGroupFilter, appliedRoomTypeFilter, appliedNameFilter]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchForms();
      await fetchSettings();
      await fetchRooms();
      setLoading(false);
    };
    init();
  }, [fetchForms, fetchSettings, fetchRooms]);

  // 폼 변경 시 첫 페이지 로드
  useEffect(() => {
    if (!selectedFormId) return;
    fetchParticipants(selectedFormId, 1);
  }, [selectedFormId, fetchParticipants]);

  // 참가자 삭제
  const deleteParticipant = async (participantId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const collectionName = `participants_${selectedFormId}`;
    await fetch('/api/admin/attendees/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionName, participantId }),
    });

    fetchParticipants(selectedFormId);
  };

  // 결제 상태 토글
  const togglePaymentStatus = async (participantId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const collectionName = `participants_${selectedFormId}`;

    await fetch('/api/admin/attendees/payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionName,
        participantId,
        paymentStatus: newStatus
      }),
    });

    fetchParticipants(selectedFormId);
  };

  // 방 배정 (roomNumber 기반)
  const assignRoom = async (participantId, roomNumber) => {
    const collectionName = `participants_${selectedFormId}`;
    const participant = participants.find(p => p.id === participantId);

    // 배정 해제
    if (!roomNumber || roomNumber === null || roomNumber === '') {
      if (!confirm('방 배정을 해제하시겠습니까?')) return;

      const res = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName,
          participantId,
          roomNumber: null,
        }),
      });

      // 로컬 상태 업데이트 (깜빡거림 방지)
      const data = await res.json();
      if (data.ok && data.participant) {
        setParticipants(prev =>
          prev.map(p => p.id === participantId ? { ...p, ...data.participant } : p)
        );
      }
      return;
    }

    // 숙박 날짜가 있는지 확인
    const accommodationDates = participant?.accommodationDates || [];
    if (accommodationDates.length === 0) {
      if (!confirm(`${participant?.name || '이 참가자'}님은 숙박 신청을 하지 않았습니다. 그래도 배정하시겠습니까?`)) {
        return;
      }
    }

    // 정원 초과 경고 - 날짜별로 체크
    if (accommodationDates.length > 0) {
      // 날짜별로 표준 형식으로 변환하는 함수
      const parseKoreanDate = (dateStr) => {
        // "2026년 1월 7일 (Day3 - 수요일)" → "2026-01-07"
        const matchWithYear = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        if (matchWithYear) {
          const year = matchWithYear[1];
          const month = matchWithYear[2].padStart(2, '0');
          const day = matchWithYear[3].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        // "1월 26일 (Day1)" → "2026-01-26"
        const matchWithoutYear = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (matchWithoutYear) {
          const year = 2026;
          const month = matchWithoutYear[1].padStart(2, '0');
          const day = matchWithoutYear[2].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        // 이미 YYYY-MM-DD 형식이면 그대로 반환
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }

        return null;
      };

      for (const accomDate of accommodationDates) {
        const standardDate = parseKoreanDate(accomDate);

        // 해당 날짜, 해당 방 번호의 방 찾기
        const roomOnDate = rooms.find(r =>
          (r.roomNumber === roomNumber || r.name?.replace(/[^\d]/g, '') === roomNumber) &&
          r.date === standardDate
        );

        if (roomOnDate) {
          // 해당 날짜에 이 방에 배정된 참가자들 찾기 (자기 자신 제외)
          const participantsInRoomOnDate = participants.filter(p => {
            if (p.id === participantId) return false;

            // roomAssignments가 있으면 그것으로 체크
            if (p.roomAssignments && typeof p.roomAssignments === 'object') {
              for (const dateKey in p.roomAssignments) {
                const assignment = p.roomAssignments[dateKey];
                if (assignment.roomId === roomOnDate.id ||
                    (assignment.standardDate === standardDate && p.roomNumber === roomNumber)) {
                  return true;
                }
              }
              return false; // roomAssignments가 있으면 명시적으로 false
            }

            // roomAssignments가 없으면 스킵 (날짜별 정보 없음)
            return false;
          });

          const currentOccupancy = participantsInRoomOnDate.reduce((sum, p) => sum + (p.totalPeople || 1), 0);
          const afterOccupancy = currentOccupancy + (participant.totalPeople || 1);

          if (afterOccupancy > roomOnDate.capacity) {
            const warningMessage = `⚠️ 정원 초과 경고!\n\n` +
              `방: ${roomNumber}호\n` +
              `날짜: ${accomDate}\n` +
              `정원: ${roomOnDate.capacity}명\n` +
              `현재 배정: ${currentOccupancy}명\n` +
              `배정 후: ${afterOccupancy}명 (${afterOccupancy - roomOnDate.capacity}명 초과)\n\n` +
              `그래도 배정하시겠습니까?`;

            if (!confirm(warningMessage)) {
              return;
            }
            break; // 한 번만 경고
          }
        }
      }
    }

    // Optimistic Update: 먼저 UI 업데이트
    const previousParticipants = [...participants];
    setParticipants(prev =>
      prev.map(p => p.id === participantId ? { ...p, roomNumber, _pending: true } : p)
    );

    try {
      const res = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName,
          participantId,
          roomNumber,
        }),
      });

      const data = await res.json();
      if (data.ok && data.participant) {
        // 성공: 서버 응답으로 최종 업데이트
        setParticipants(prev =>
          prev.map(p => p.id === participantId ? { ...p, ...data.participant, _pending: false } : p)
        );
      } else {
        // 실패: 롤백
        setParticipants(previousParticipants);
        alert('방 배정에 실패했습니다.');
      }
    } catch (error) {
      // 에러: 롤백
      setParticipants(previousParticipants);
      alert('방 배정 중 오류가 발생했습니다.');
    }
  };

  // 방 배정 페이지로 이동
  const goToRoomAssignment = () => {
    window.location.href = '/admin/rooms';
  };

  if (loading) {
    return (
      <main className="p-6">
        <p>로딩 중...</p>
      </main>
    );
  }

  if (forms.length === 0) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">인원 관리</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">등록된 폼이 없습니다.</p>
          <a
            href="/admin/forms"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            폼 관리 페이지로 이동
          </a>
        </div>
      </main>
    );
  }

  const currentForm = forms.find(f => f.id === selectedFormId);

  // 현재 폼에 accommodation-calculator가 있는지 확인
  const hasAccommodation = currentForm?.fields?.some(f => f.type === 'accommodation-calculator');

  // 그룹 ID 목록 추출 (중복 제거) - 현재 페이지 데이터에서만
  const groupIds = Array.from(new Set(
    participants
      .filter(p => p.groupId)
      .map(p => p.groupId)
  )).sort();

  // 방 타입 목록 추출 (중복 제거)
  const roomTypes = Array.from(new Set(
    participants
      .filter(p => p.roomType)
      .map(p => p.roomType)
  )).sort();

  // 서버에서 필터링된 데이터를 받으므로 클라이언트 필터링 불필요
  const filteredParticipants = participants;

  // 엑셀용 값 포맷팅
  const formatExcelValue = (field, value, participant) => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (field.type) {
      case 'checkbox':
        return value ? '✓' : '✗';

      case 'checkbox-multiple':
      case 'select-multiple':
        return Array.isArray(value) ? value.join(', ') : value;

      case 'checkbox-dates':
        const dateFieldId = `${field.id}_dates`;
        const attendanceDates = participant[dateFieldId];
        if (Array.isArray(attendanceDates) && attendanceDates.length > 0) {
          return attendanceDates.join(', ');
        }
        return '-';

      case 'people-count':
        const totalPeople = participant.totalPeople || 0;
        const totalAdult = participant.extraCounts?.adult || 0;
        const totalMinor8plus = participant.extraCounts?.minor8plus || 0;
        const totalMinorUnder8 = participant.extraCounts?.minorUnder8 || 0;
        return `총 ${totalPeople}명 (성인 ${totalAdult}, 8세↑ ${totalMinor8plus}, 8세↓ ${totalMinorUnder8})`;

      case 'date-of-birth':
        if (!value) return '-';
        const birthYear = new Date(value).getFullYear();
        const thisYear = new Date().getFullYear();
        const age = thisYear - birthYear;
        return `${value} (만 ${age}세)`;

      case 'payment-calculator':
        const paymentDateFieldId = `${field.id}_dates`;
        const paymentDates = participant[paymentDateFieldId];
        const amountDisplay = participant.amount?.total
          ? `${participant.amount.total.toLocaleString()}원`
          : '-';

        if (!Array.isArray(paymentDates) || paymentDates.length === 0) {
          return amountDisplay;
        }

        return `${paymentDates.join(', ')}\n${amountDisplay}`;

      case 'accommodation-calculator':
        const accomDates = participant.accommodationDates;
        const roomType = participant.roomType || '-';
        const accomAmount = participant.accommodationAmount?.total
          ? `${participant.accommodationAmount.total.toLocaleString()}원`
          : '-';

        const roomOptionsFieldId = `${field.id}_roomOptions`;
        const peopleCount = participant[roomOptionsFieldId]?.count || '-';

        if (!Array.isArray(accomDates) || accomDates.length === 0) {
          return `${roomType} / ${peopleCount}명 / ${accomAmount}`;
        }

        return `${accomDates.join(', ')}\n${roomType} / ${peopleCount}명 / ${accomAmount}`;

      default:
        return value.toString();
    }
  };

  // 엑셀 다운로드
  const downloadExcel = async () => {
    if (!currentForm) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // 전체 참가자 데이터 가져오기 (페이지네이션 없이)
    const collectionName = `participants_${selectedFormId}`;
    const params = new URLSearchParams({
      collectionName,
      page: '1',
      limit: '10000' // 충분히 큰 숫자로 전체 데이터 가져오기
    });

    // 적용된 필터만 추가
    if (appliedPaymentFilter) params.append('paymentStatus', appliedPaymentFilter);
    if (appliedGroupFilter) params.append('groupId', appliedGroupFilter);
    if (appliedRoomTypeFilter) params.append('roomType', appliedRoomTypeFilter);
    if (appliedNameFilter) params.append('searchName', appliedNameFilter);

    const res = await fetch(`/api/admin/participants?${params.toString()}`);
    const data = await res.json();
    const allParticipants = data.participants || [];

    if (allParticipants.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // 엑셀 데이터 생성
    const excelData = allParticipants.map((participant, index) => {
      const row = {
        '번호': index + 1,
      };

      // 그룹 정보
      if (participant.groupId) {
        const groupMembers = allParticipants.filter(p => p.groupId === participant.groupId);
        const representative = groupMembers.find(p => p.isRepresentative);
        const nameField = currentForm?.fields?.find(f => f.type === 'text' && (f.label?.includes('이름') || f.label?.includes('성명')));
        const repName = representative?.[nameField?.id] || '알 수 없음';
        row['그룹'] = participant.isRepresentative ? `대표자 (${repName})` : `구성원 (${repName})`;
      } else {
        row['그룹'] = '-';
      }

      // 폼 필드 데이터
      currentForm.fields.forEach(field => {
        const value = participant[field.id];
        row[field.label] = formatExcelValue(field, value, participant);
      });

      // 참석 날짜 (payment-calculator 또는 accommodation-calculator)
      const paymentField = currentForm?.fields?.find(f => f.type === 'payment-calculator');
      const accomField = currentForm?.fields?.find(f => f.type === 'accommodation-calculator');

      if (paymentField) {
        const paymentDateFieldId = `${paymentField.id}_dates`;
        const paymentDates = participant[paymentDateFieldId];
        row['참석 날짜'] = Array.isArray(paymentDates) && paymentDates.length > 0
          ? paymentDates.join(', ')
          : '-';
      }

      if (accomField) {
        const accomDates = participant.accommodationDates;
        row['숙박 날짜'] = Array.isArray(accomDates) && accomDates.length > 0
          ? accomDates.join(', ')
          : '-';
      }

      // 가격 정보
      const participationFee = participant.amount?.total || 0;
      const accommodationFee = participant.accommodationAmount?.total || 0;
      const totalAmount = participationFee + accommodationFee;

      if (paymentField) {
        row['참가비'] = participationFee > 0 ? `${participationFee.toLocaleString()}원` : '-';
      }

      if (accomField) {
        row['숙박비'] = accommodationFee > 0 ? `${accommodationFee.toLocaleString()}원` : '-';
      }

      if (paymentField || accomField) {
        row['총 금액'] = totalAmount > 0 ? `${totalAmount.toLocaleString()}원` : '-';
      }

      // 등록일
      row['등록일'] = participant.registeredAt || '-';

      // 결제상태
      row['결제상태'] = participant.paymentStatus === 'paid' ? '납부완료' : '미납';

      // 숙박 인원 (숙박이 있는 경우)
      if (hasAccommodation) {
        const accommodationField = currentForm?.fields?.find(f => f.type === 'accommodation-calculator');
        if (accommodationField) {
          const hasAccommodationDates = participant.accommodationDates && participant.accommodationDates.length > 0;
          if (hasAccommodationDates) {
            const roomOptionsFieldId = `${accommodationField.id}_roomOptions`;
            const peopleCount = parseInt(participant[roomOptionsFieldId]?.count) || 1;
            row['숙박 인원'] = `${peopleCount}명`;
          } else {
            row['숙박 인원'] = '-';
          }
        }

        // 방 배정
        if (participant.roomNumber) {
          row['방 배정'] = `${participant.roomNumber}호`;
        } else {
          row['방 배정'] = '미배정';
        }
      }

      return row;
    });

    // 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '참가자 목록');

    // 열 너비 자동 조정
    const maxWidths = {};
    excelData.forEach(row => {
      Object.keys(row).forEach(key => {
        const value = String(row[key] || '');
        const width = Math.max(
          key.length,
          ...value.split('\n').map(line => line.length)
        );
        maxWidths[key] = Math.max(maxWidths[key] || 10, width);
      });
    });

    worksheet['!cols'] = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidths[key] * 1.2, 50)
    }));

    // 파일 다운로드
    const fileName = `${currentForm.name}_참가자목록_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 방 번호로 그룹화 (중복 제거)
  const roomNumbersSet = new Set();
  rooms.forEach(room => {
    const roomNum = room.roomNumber || room.name?.replace(/[^\d]/g, '');
    if (roomNum) roomNumbersSet.add(roomNum);
  });
  let uniqueRoomNumbers = Array.from(roomNumbersSet).sort((a, b) => parseInt(a) - parseInt(b));

  // 날짜별로 표준 형식으로 변환하는 함수
  const parseKoreanDateUtil = (dateStr) => {
    const matchWithYear = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (matchWithYear) {
      return `${matchWithYear[1]}-${matchWithYear[2].padStart(2, '0')}-${matchWithYear[3].padStart(2, '0')}`;
    }
    const matchWithoutYear = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (matchWithoutYear) {
      return `2026-${matchWithoutYear[1].padStart(2, '0')}-${matchWithoutYear[2].padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    return null;
  };

  // 방별 최대 점유율 계산 함수 (모든 날짜 중 가장 많이 찬 날짜 기준)
  const calculateMaxRoomOccupancy = (roomNum) => {
    // 해당 방 번호의 모든 날짜별 방 찾기
    const roomsForNumber = rooms.filter(r =>
      r.roomNumber === roomNum || r.name?.replace(/[^\d]/g, '') === roomNum
    );

    if (roomsForNumber.length === 0) {
      return { capacity: 0, maxOccupancy: 0, availableSpace: 0 };
    }

    const capacity = roomsForNumber[0].capacity;
    let maxOccupancy = 0;

    // 각 날짜별로 점유율 계산하여 최대값 찾기
    roomsForNumber.forEach(roomOnDate => {
      const participantsInRoomOnDate = participants.filter(p => {
        if (!p.roomAssignments || typeof p.roomAssignments !== 'object') {
          return false;
        }

        const hasAssignment = Object.keys(p.roomAssignments).length > 0;
        if (!hasAssignment) return false;

        for (const dateKey in p.roomAssignments) {
          const assignment = p.roomAssignments[dateKey];
          if (assignment.roomId === roomOnDate.id ||
              (assignment.standardDate === roomOnDate.date && p.roomNumber === roomNum)) {
            return true;
          }
        }
        return false;
      });

      const occupancy = participantsInRoomOnDate.reduce((sum, p) => sum + (p.totalPeople || 1), 0);
      maxOccupancy = Math.max(maxOccupancy, occupancy);
    });

    return { capacity, maxOccupancy, availableSpace: capacity - maxOccupancy };
  };

  // 방 필터링 (만실 방 숨기기)
  if (hideFullRooms) {
    uniqueRoomNumbers = uniqueRoomNumbers.filter(roomNum => {
      const { availableSpace } = calculateMaxRoomOccupancy(roomNum);
      return availableSpace > 0;
    });
  }

  // 방 필터링 (방 타입별)
  if (roomAssignmentCapacityFilter) {
    uniqueRoomNumbers = uniqueRoomNumbers.filter(roomNum => {
      const sampleRoom = rooms.find(r =>
        r.roomNumber === roomNum || r.name?.replace(/[^\d]/g, '') === roomNum
      );
      if (!sampleRoom) return false;

      return sampleRoom.capacity === parseInt(roomAssignmentCapacityFilter);
    });
  }

  // 방 정렬
  if (roomSortOption === 'mostSpace') {
    // 여유 공간 많은 순
    uniqueRoomNumbers = uniqueRoomNumbers.sort((a, b) => {
      const spaceA = calculateMaxRoomOccupancy(a).availableSpace;
      const spaceB = calculateMaxRoomOccupancy(b).availableSpace;
      return spaceB - spaceA;
    });
  } else if (roomSortOption === 'leastSpace') {
    // 여유 공간 적은 순
    uniqueRoomNumbers = uniqueRoomNumbers.sort((a, b) => {
      const spaceA = calculateMaxRoomOccupancy(a).availableSpace;
      const spaceB = calculateMaxRoomOccupancy(b).availableSpace;
      return spaceA - spaceB;
    });
  } else {
    // 방 번호 순 (기본값)
    uniqueRoomNumbers = uniqueRoomNumbers.sort((a, b) => parseInt(a) - parseInt(b));
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">인원 관리</h1>

      {/* 폼 선택 */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">등록 폼 선택</label>
        <select
          value={selectedFormId}
          onChange={(e) => {
            setSelectedFormId(e.target.value);
            // 폼 변경시 모든 필터 및 페이지 초기화
            setGroupFilter('');
            setNameFilter('');
            setPaymentFilter('');
            setRoomTypeFilter('');
            setCurrentPage(1);
          }}
          className="w-full max-w-md border border-gray-300 rounded-md p-2"
        >
          {forms.map(form => (
            <option key={form.id} value={form.id}>
              {form.name} 
            </option>
          ))}
        </select>
      </div>

      {/* 그룹 필터 (그룹이 있는 경우만 표시) */}
      {groupIds.length > 0 && (
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">그룹 필터</label>
          <div className="flex gap-2 items-center">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="flex-1 max-w-md border border-gray-300 rounded-md p-2"
            >
              <option value="">전체 보기 ({participants.length}명)</option>
              {groupIds.map(groupId => {
                const groupMembers = participants.filter(p => p.groupId === groupId);
                const representative = groupMembers.find(p => p.isRepresentative);

                // 대표자의 이름과 전화번호 가져오기
                const nameField = currentForm?.fields?.find(f => f.type === 'text' && (f.label?.includes('이름') || f.label?.includes('성명')));
                const phoneField = currentForm?.fields?.find(f => f.type === 'tel');

                const repName = representative?.[nameField?.id] || representative?.representativeName || '알 수 없음';
                const repPhone = representative?.[phoneField?.id] || '';

                const groupLabel = repPhone
                  ? `${repName} (${repPhone})`
                  : repName;

                return (
                  <option key={groupId} value={groupId}>
                    그룹: {groupLabel} - {groupMembers.length}명
                  </option>
                );
              })}
            </select>
            {groupFilter && (
              <button
                onClick={() => setGroupFilter('')}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                필터 해제
              </button>
            )}
          </div>
        </div>
      )}

      {/* 추가 필터 (이름, 결제상태, 방 타입) */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium mb-3">필터</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 이름 필터 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">이름 검색</label>
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="이름 입력..."
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>

          {/* 결제상태 필터 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">결제상태</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              <option value="">전체</option>
              <option value="paid">납부완료</option>
              <option value="unpaid">미납</option>
            </select>
          </div>

          {/* 방 타입 필터 (숙박이 있는 경우만 표시) */}
          {hasAccommodation && roomTypes.length > 0 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">방 타입</label>
              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
              >
                <option value="">전체</option>
                {roomTypes.map(roomType => (
                  <option key={roomType} value={roomType}>
                    {roomType}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 검색 및 초기화 버튼 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            검색
          </button>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            초기화
          </button>
        </div>

        {/* 적용된 필터 표시 */}
        {(appliedNameFilter || appliedPaymentFilter || appliedRoomTypeFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-600 font-medium">적용된 필터:</span>
              {appliedNameFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  이름: {appliedNameFilter}
                </span>
              )}
              {appliedPaymentFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  결제: {appliedPaymentFilter === 'paid' ? '납부완료' : '미납'}
                </span>
              )}
              {appliedRoomTypeFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  방 타입: {appliedRoomTypeFilter}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 페이지네이션 컨트롤 */}
      {pagination && (pagination.hasNext || pagination.hasPrev) && (
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              페이지 {pagination.page} (현재 {filteredParticipants.length}건 표시)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchParticipants(selectedFormId, 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                처음
              </button>
              <button
                onClick={() => fetchParticipants(selectedFormId, currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm font-medium">
                페이지 {pagination.page}
              </span>
              <button
                onClick={() => fetchParticipants(selectedFormId, currentPage + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                다음
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  fetchParticipants(selectedFormId, 1);
                }}
                className="ml-4 px-2 py-1 border rounded text-sm"
              >
                <option value="10">10개씩</option>
                <option value="20">20개씩</option>
                <option value="50">50개씩</option>
                <option value="100">100개씩</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 참가자 목록 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {(() => {
              // 전체 인원 합계 계산
              const totalPeople = filteredParticipants.reduce((sum, p) => {
                return sum + (p.totalPeople || 1);
              }, 0);
              const accommodationField = currentForm?.fields?.find(f => f.type === 'accommodation-calculator');
              return (
                <>
                  {currentForm?.name} 참가자 목록 (현재 페이지: {filteredParticipants.length}건)
                  {!accommodationField && <span className="text-xl font-semibold">&nbsp;</span>}
                  {(groupFilter || paymentFilter || nameFilter || roomTypeFilter) && <span className="text-sm text-gray-600 ml-2">(필터링됨)</span>}
                </>
              );
            })()}
            {hasAccommodation && (() => {
              // 숙박 인원 합계 계산
              const accommodationField = currentForm?.fields?.find(f => f.type === 'accommodation-calculator');
              if (!accommodationField) return null;

              const roomOptionsFieldId = `${accommodationField.id}_roomOptions`;
              const totalAccommodationPeople = filteredParticipants.reduce((sum, p) => {
                // 숙박 날짜가 있는 참가자만 카운트
                const hasAccommodationDates = p.accommodationDates && p.accommodationDates.length > 0;
                if (!hasAccommodationDates) return sum;

                const count = parseInt(p[roomOptionsFieldId]?.count) || 1;
                return sum + count;
              }, 0);

              return (
                <span className="text-xl font-semibold">
                   &nbsp; {totalAccommodationPeople}명)
                </span>
              );
            })()}
          </h2>
          <div className="flex gap-2">
            {filteredParticipants.length > 0 && (
              <button
                onClick={downloadExcel}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
              >
                엑셀 다운로드
              </button>
            )}
            {hasAccommodation && filteredParticipants.length > 0 && (
              <button
                onClick={goToRoomAssignment}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
              >
                방 배정 관리
              </button>
            )}
          </div>
        </div>

        {filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {groupFilter ? '해당 그룹에 참가자가 없습니다.' : '등록된 참가자가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">그룹 ID</th>
                  {currentForm?.fields.map(field => (
                    <th key={field.id} className="border p-2">{field.label}</th>
                  ))}
                  <th className="border p-2">등록일</th>
                  <th className="border p-2">결제상태</th>
                  {hasAccommodation && <th className="border p-2">숙박 인원</th>}
                  {hasAccommodation && (
                    <th className="border p-2">
                      <div className="flex flex-col gap-2">
                        <div>방 배정</div>
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-normal cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hideFullRooms}
                              onChange={(e) => setHideFullRooms(e.target.checked)}
                              className="w-3 h-3"
                            />
                            <span>만실 방 숨기기</span>
                          </label>
                          <select
                            value={roomAssignmentCapacityFilter}
                            onChange={(e) => setRoomAssignmentCapacityFilter(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5"
                          >
                            <option value="">모든 방 타입</option>
                            {Array.from(new Set(rooms.map(r => r.capacity)))
                              .sort((a, b) => a - b)
                              .map(capacity => (
                                <option key={capacity} value={capacity}>
                                  {capacity}인실
                                </option>
                              ))}
                          </select>
                          <select
                            value={roomSortOption}
                            onChange={(e) => setRoomSortOption(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5"
                          >
                            <option value="roomNumber">방 번호 순</option>
                            <option value="mostSpace">여유 많은 순</option>
                            <option value="leastSpace">여유 적은 순</option>
                          </select>
                        </div>
                      </div>
                    </th>
                  )}
                  <th className="border p-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map(participant => (
                  <tr key={participant.id}>
                    <td className="border p-2">
                      {participant.groupId ? (
                        (() => {
                          // 대표자의 이름과 전화번호 찾기
                          const groupMembers = participants.filter(p => p.groupId === participant.groupId);
                          const representative = groupMembers.find(p => p.isRepresentative);

                          const nameField = currentForm?.fields?.find(f => f.type === 'text' && (f.label?.includes('이름') || f.label?.includes('성명')));
                          const phoneField = currentForm?.fields?.find(f => f.type === 'tel');

                          const repName = representative?.[nameField?.id] || participant.representativeName || '알 수 없음';
                          const repPhone = representative?.[phoneField?.id] || '';

                          return (
                            <div className="text-xs">
                              <div className={`font-medium ${participant.isRepresentative ? 'text-blue-600' : 'text-gray-600'}`}>
                                {participant.isRepresentative ? '👤 대표자' : '👥 구성원'}
                              </div>
                              <div className="text-[10px] text-gray-700 mt-0.5">
                                {repName}
                              </div>
                              {repPhone && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {repPhone}
                                </div>
                              )}
                              <button
                                onClick={() => setGroupFilter(participant.groupId)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 underline mt-1 block"
                              >
                                그룹 보기 ({groupMembers.length}명)
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    {currentForm?.fields.map(field => (
                      <td key={field.id} className="border p-2">
                        {renderFieldValue(field, participant[field.id], participant)}
                      </td>
                    ))}
                    <td className="border p-2">{participant.registeredAt || '-'}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => togglePaymentStatus(participant.id, participant.paymentStatus)}
                        className={`px-3 py-1 rounded text-xs font-medium transition hover:opacity-80 ${
                          participant.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {participant.paymentStatus === 'paid' ? '납부완료' : '미납'}
                      </button>
                    </td>
                    {hasAccommodation && (
                      <td className="border p-2">
                        {(() => {
                          const accommodationField = currentForm?.fields?.find(f => f.type === 'accommodation-calculator');
                          if (!accommodationField) return '-';

                          // 숙박 날짜가 없으면 '-' 표시
                          const hasAccommodationDates = participant.accommodationDates && participant.accommodationDates.length > 0;
                          if (!hasAccommodationDates) return '-';

                          const roomOptionsFieldId = `${accommodationField.id}_roomOptions`;
                          const peopleCount = parseInt(participant[roomOptionsFieldId]?.count) || 1;

                          return (
                            <span className="font-medium text-blue-600">
                              {peopleCount}명
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    {hasAccommodation && (
                      <td className="border p-2">
                        {participant.roomNumber ? (
                          <div className="text-xs">
                            <div className="font-semibold text-blue-700">{participant.roomNumber}호</div>
                            <div className="text-gray-500 text-[10px] mt-0.5">
                              {participant.accommodationDates?.length || 0}일 배정됨
                            </div>
                            <button
                              onClick={() => assignRoom(participant.id, null)}
                              className="text-red-600 hover:text-red-800 text-[10px] underline mt-1"
                            >
                              배정 해제
                            </button>
                          </div>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => assignRoom(participant.id, e.target.value)}
                            className="w-full border border-gray-300 rounded p-1 text-xs"
                          >
                            <option value="">방 선택</option>
                            {uniqueRoomNumbers
                              .filter(roomNum => {
                                // 참가자의 방 타입과 일치하는 방만 표시
                                const participantRoomType = participant.roomType;
                                if (!participantRoomType) return true;

                                const sampleRoom = rooms.find(r =>
                                  (r.roomNumber === roomNum || r.name?.replace(/[^\d]/g, '') === roomNum)
                                );

                                if (!sampleRoom) return false;

                                const typeMatch = participantRoomType.match(/(\d+)인실/);
                                if (!typeMatch) return true;

                                const requiredCapacity = parseInt(typeMatch[1]);
                                return sampleRoom.capacity === requiredCapacity;
                              })
                              .map(roomNum => {
                                const sampleRoom = rooms.find(r =>
                                  (r.roomNumber === roomNum || r.name?.replace(/[^\d]/g, '') === roomNum)
                                );

                                const capacity = sampleRoom?.capacity || 0;

                                // 날짜별로 표준 형식으로 변환하는 함수
                                const parseKoreanDate = (dateStr) => {
                                  const matchWithYear = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
                                  if (matchWithYear) {
                                    return `${matchWithYear[1]}-${matchWithYear[2].padStart(2, '0')}-${matchWithYear[3].padStart(2, '0')}`;
                                  }
                                  const matchWithoutYear = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
                                  if (matchWithoutYear) {
                                    return `2026-${matchWithoutYear[1].padStart(2, '0')}-${matchWithoutYear[2].padStart(2, '0')}`;
                                  }
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                                    return dateStr;
                                  }
                                  return null;
                                };

                                // 현재 참가자의 숙박 날짜
                                const myAccommodationDates = participant.accommodationDates || [];

                                // 내 숙박 날짜들을 표준 형식으로 변환
                                const myStandardDates = myAccommodationDates
                                  .map(date => parseKoreanDate(date))
                                  .filter(date => date !== null);

                                // 내 숙박 날짜들 중에서 각 날짜별 배정 인원 계산
                                let maxOccupancy = 0;
                                myStandardDates.forEach(standardDate => {
                                  // 해당 날짜의 해당 방 번호 방 찾기
                                  const roomOnDate = rooms.find(r =>
                                    (r.roomNumber === roomNum || r.name?.replace(/[^\d]/g, '') === roomNum) &&
                                    r.date === standardDate
                                  );

                                  if (roomOnDate) {
                                    // 해당 날짜에 이 방에 배정된 참가자들 찾기 (자기 자신 제외)
                                    const participantsInRoomOnDate = participants.filter(p => {
                                      if (p.id === participant.id) return false; // 자기 자신 제외

                                      // roomAssignments로 체크 (정확한 날짜별 매칭)
                                      if (p.roomAssignments && typeof p.roomAssignments === 'object') {
                                        const hasAssignment = Object.keys(p.roomAssignments).length > 0;
                                        if (!hasAssignment) return false; // 빈 객체는 스킵

                                        for (const dateKey in p.roomAssignments) {
                                          const assignment = p.roomAssignments[dateKey];
                                          if (assignment.roomId === roomOnDate.id ||
                                              (assignment.standardDate === standardDate && p.roomNumber === roomNum)) {
                                            return true;
                                          }
                                        }
                                        return false;
                                      }
                                      return false;
                                    });

                                    const occupancy = participantsInRoomOnDate.reduce((sum, p) => sum + (p.totalPeople || 1), 0);
                                    maxOccupancy = Math.max(maxOccupancy, occupancy);
                                  }
                                });

                                const isOverCapacity = maxOccupancy >= capacity;
                                const remarks = sampleRoom?.remarks || '';

                                return (
                                  <option
                                    key={roomNum}
                                    value={roomNum}
                                    style={{
                                      color: isOverCapacity ? '#dc2626' : '#000',
                                      fontWeight: isOverCapacity ? 'bold' : 'normal'
                                    }}
                                  >
                                    {roomNum}호 ({maxOccupancy}/{capacity}명){remarks && ` [${remarks}]`}{isOverCapacity ? ' 만실' : ''}
                                  </option>
                                );
                              })}
                          </select>
                        )}
                      </td>
                    )}
                    <td className="border p-2">
                      <button
                        onClick={() => deleteParticipant(participant.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

// 필드 값 렌더링 헬퍼
function renderFieldValue(field, value, participant) {
  // payment-calculator와 accommodation-calculator는 value가 없어도 처리
  const skipValueCheck = ['payment-calculator', 'accommodation-calculator'].includes(field.type);

  if (!skipValueCheck && (value === null || value === undefined)) {
    return '-';
  }

  switch (field.type) {
    case 'checkbox':
      return value ? '✓' : '✗';

    case 'checkbox-multiple':
    case 'select-multiple':
      return Array.isArray(value) ? value.join(', ') : value;

    case 'checkbox-dates':
      // payment-calculator에서 선택한 집회 참석 날짜 표시
      const dateFieldId = `${field.id}_dates`;
      const attendanceDates = participant[dateFieldId];
      if (Array.isArray(attendanceDates) && attendanceDates.length > 0) {
        return attendanceDates.join(', ');
      }
      return '-';

    case 'people-count':
      // 추가 인원 + 대표자 포함 총 인원 표시
      const extraAdult = (typeof value === 'object') ? (value.adult || 0) : 0;
      const extraMinor8plus = (typeof value === 'object') ? (value.minor8plus || 0) : 0;
      const extraMinorUnder8 = (typeof value === 'object') ? (value.minorUnder8 || 0) : 0;

      const totalAdult = participant.extraCounts?.adult || 0;
      const totalMinor8plus = participant.extraCounts?.minor8plus || 0;
      const totalMinorUnder8 = participant.extraCounts?.minorUnder8 || 0;
      const totalPeople = participant.totalPeople || 0;

      return (
        <div className="text-sm">
          <div className="text-gray-600 text-xs  pt-1">
            총 {totalPeople}명 (성인 {totalAdult}, 8세↑ {totalMinor8plus}, 8세↓ {totalMinorUnder8})
          </div>
        </div>
      );

    case 'date-of-birth':
      if (!value) return '-';
      const birthYear = new Date(value).getFullYear();
      const thisYear = new Date().getFullYear();
      const age = thisYear - birthYear;
      return `${value} (만 ${age}세)`;

    case 'payment-calculator':
      // 참석 날짜와 참가비 표시
      const paymentDateFieldId = `${field.id}_dates`;
      const paymentDates = participant[paymentDateFieldId];

      if (!Array.isArray(paymentDates) || paymentDates.length === 0) {
        const amountOnly = participant.amount?.total
          ? `${participant.amount.total.toLocaleString()}원`
          : '-';
        return amountOnly;
      }

      const amountDisplay = participant.amount?.total
        ? `${participant.amount.total.toLocaleString()}원`
        : '-';

      return (
        <div className="whitespace-pre-line">
          {paymentDates.map((date, idx) => (
            <div key={idx}>{date}</div>
          ))}
          <div className="font-semibold mt-1 pt-1 border-t">{amountDisplay}</div>
        </div>
      );

    case 'accommodation-calculator':
      // 숙박 날짜, 방 타입, 인원수, 숙박비 표시
      const accomDates = participant.accommodationDates;
      const roomType = participant.roomType || '-';
      const accomAmount = participant.accommodationAmount?.total
        ? `${participant.accommodationAmount.total.toLocaleString()}원`
        : '-';

      // 인원수 가져오기
      const roomOptionsFieldId = `${field.id}_roomOptions`;
      const peopleCount = participant[roomOptionsFieldId]?.count || '-';

      if (!Array.isArray(accomDates) || accomDates.length === 0) {
        return `${roomType} / ${peopleCount}명 / ${accomAmount}`;
      }

      return (
        <div className="whitespace-pre-line">
          {accomDates.map((date, idx) => (
            <div key={idx}>{date}</div>
          ))}
          <div className="font-semibold mt-1 pt-1 border-t">
            {roomType} / {peopleCount}명 / {accomAmount}
          </div>
        </div>
      );

    default:
      return value.toString();
  }
}
