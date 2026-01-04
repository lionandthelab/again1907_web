import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '../_auth';

// GET: 방 목록 + 참가자 현황
export async function GET(req) {
  const deny = requireAdmin(req); if (deny) return deny;

  // settings 불러오기
  const settingsSnap = await adminDb.collection('settings').doc('current').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : { dbName: 'participants_default' };
  const collectionName = settings.dbName || 'participants_default';

  // 방 목록
  const roomsSnap = await adminDb.collection('rooms').get();
  const rooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 참가자 목록
  const participantsSnap = await adminDb.collection(collectionName).get();
  const participants = participantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 방별 참가자 연결
  const result = rooms.map(room => {
    const assigned = participants.filter(p => p.roomId === room.id);
    return {
      ...room,
      participants: assigned,
      currentPeople: assigned.reduce((sum, p) => sum + (p.totalPeople || 1), 0),
    };
  });

  return NextResponse.json({ rooms: result });
}

// POST: 방 여러 개 생성 (날짜별로 개별 생성)
export async function POST(req) {
  const deny = requireAdmin(req); if (deny) return deny;
  const { start, end, startDate, endDate, group, capacity, remarks } = await req.json();

  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  const cap = parseInt(capacity, 10);

  // 날짜 범위 계산
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const dates = [];

  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD 형식
  }

  // 방 번호 × 날짜 조합으로 생성
  const batch = adminDb.batch();
  for (let roomNum = startNum; roomNum <= endNum; roomNum++) {
    for (const date of dates) {
      const roomRef = adminDb.collection('rooms').doc();
      batch.set(roomRef, {
        roomNumber: roomNum.toString(),
        date: date,
        name: `${roomNum}호 (${date})`,
        capacity: cap,
        group,
        remarks: remarks || '', // 비고 필드 추가 (여자방/남자방/가족실/혼합 등)
        createdAt: new Date()
      });
    }
  }
  await batch.commit();

  return NextResponse.json({
    ok: true,
    created: (endNum - startNum + 1) * dates.length
  });
}

// DELETE: 여러 방 삭제
export async function DELETE(req) {
  const deny = requireAdmin(req); if (deny) return deny;

  const body = await req.json();
  const roomIds = body.roomIds;
  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    return new NextResponse('roomIds is required', { status: 400 });
  }

  const batch = adminDb.batch();
  roomIds.forEach(id => {
    const ref = adminDb.collection('rooms').doc(id);
    batch.delete(ref);
  });
  await batch.commit();

  return NextResponse.json({ ok: true, deleted: roomIds.length });
}
