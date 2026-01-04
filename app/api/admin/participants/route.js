import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '../_auth';

export async function GET(req) {
  const deny = requireAdmin(req); if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const collectionName = searchParams.get('collectionName');

  // 페이지네이션 파라미터
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  // 필터링 파라미터
  const paymentStatus = searchParams.get('paymentStatus'); // 'paid', 'unpaid', null(전체)
  const searchName = searchParams.get('searchName');
  const groupId = searchParams.get('groupId');
  const roomType = searchParams.get('roomType');

  if (!collectionName) {
    return new NextResponse('collectionName is required', { status: 400 });
  }

  try {
    console.log('🔍 API Request:', { page, limit, paymentStatus, searchName, groupId, roomType });

    // 기본 쿼리 (정렬 없이 시작)
    let query = adminDb.collection(collectionName);

    // 서버 사이드 필터링 적용 (Firestore where 사용)
    // 이름 검색을 제외한 나머지 필터들만 서버에서 처리
    if (paymentStatus) {
      console.log('  ✅ Applying paymentStatus filter (server):', paymentStatus);
      query = query.where('paymentStatus', '==', paymentStatus);
    }

    if (groupId) {
      console.log('  ✅ Applying groupId filter (server):', groupId);
      query = query.where('groupId', '==', groupId);
    }

    if (roomType) {
      console.log('  ✅ Applying roomType filter (server):', roomType);
      query = query.where('roomType', '==', roomType);
    }

    // 모든 데이터 가져오기
    console.log('  📥 Fetching all documents...');
    const allSnap = await query.get();

    let participants = allSnap.docs.map(doc => {
      const data = doc.data();

      // createdAt 변환: Firestore Timestamp 또는 문자열 처리
      let createdAtValue = null;
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          createdAtValue = data.createdAt;
        } else if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
          createdAtValue = data.createdAt.toDate().toISOString();
        }
      }

      return {
        id: doc.id,
        ...data,
        createdAt: createdAtValue,
        roomAssignments: data.roomAssignments || {},
      };
    });

    console.log('📊 Total documents:', participants.length);

    // 클라이언트 측에서 최신순 정렬
    participants.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // 최신순
    });

    // 이름 검색 필터링 (동적 필드 포함 - 짧은 문자열 필드에서 검색)
    if (searchName) {
      console.log('  ✅ Applying name search filter:', searchName);
      const searchLower = searchName.toLowerCase();
      participants = participants.filter(p => {
        // 이름은 동적 필드(field_xxx)에 저장되므로, 짧은 문자열 필드를 모두 검색
        const searchableFields = Object.entries(p)
          .filter(([key, val]) =>
            typeof val === 'string' &&
            val.length > 0 &&
            val.length <= 20 &&
            !key.includes('date') &&
            !key.includes('Date') &&
            !key.includes('createdAt') &&
            !key.includes('roomId') &&
            !key.includes('roomName')
          )
          .map(([_, val]) => val);

        return searchableFields.some(field =>
          field.toLowerCase().includes(searchLower)
        );
      });
    }

    console.log('📊 After filtering:', participants.length);

    // 필터링된 결과에 페이지네이션 적용
    const totalFiltered = participants.length;
    const offset = (page - 1) * limit;
    const paginatedParticipants = participants.slice(offset, offset + limit);
    const hasMore = offset + limit < totalFiltered;

    console.log('🔍 Pagination:');
    console.log('  Current page:', page);
    console.log('  Total filtered:', totalFiltered);
    console.log('  Returned count:', paginatedParticipants.length);
    console.log('  Has more:', hasMore);

    return NextResponse.json({
      participants: paginatedParticipants,
      pagination: {
        page,
        limit,
        hasNext: hasMore,
        hasPrev: page > 1,
        totalFiltered,
      }
    });
  } catch (err) {
    console.error('참가자 조회 에러:', err);
    return new NextResponse('참가자 조회 실패', { status: 500 });
  }
}
