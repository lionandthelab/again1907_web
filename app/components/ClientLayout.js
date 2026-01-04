'use client';

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function ClientLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);

  const navItems = [
    { name: "홈", href: "/" },
    { name: "등록", href: "/register" },
    { name: "일정", href: "/schedule" },
    { name: "FAQ", href: "/faq" },
    { name: "등록조회", href: "/lookup" },
  ];

  return (
    <>
      {/* 네비게이션 */}
      <header className="bg-black shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* 로고 */}
          <div>
            <Link href="/">
              <Image
                src="/images/again_logo.png"
                alt="Again 1907"
                width={400}
                height={200}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>

          {/* 데스크톱 메뉴 */}
          <nav className="hidden md:block">
            <ul className="flex space-x-8 text-sm font-medium text-white">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-gray-300 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 모바일 햄버거 버튼 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white focus:outline-none"
            aria-label="메뉴 열기"
          >
            <svg
              className="w-6 h-6 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                className="transition-all duration-300"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black z-40 md:hidden">
          {/* 헤더 영역 (로고 + X버튼) */}
          <div className="h-16 flex items-center justify-between px-6">
            <div>
              <Link href="/" onClick={() => setMenuOpen(false)}>
                <Image
                  src="/images/again_logo.png"
                  alt="Again 1907"
                  width={400}
                  height={200}
                  className="h-12 w-auto"
                />
              </Link>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-white focus:outline-none"
              aria-label="메뉴 닫기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 메뉴 리스트 */}
          <nav className="px-6 pt-8">
            <ul className="flex flex-col space-y-4 text-right">
              {navItems.map((item, index) => (
                <li
                  key={item.name}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 0.08}s forwards`,
                    opacity: 0,
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block text-white text-lg font-medium hover:text-gray-300 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* 메인 */}
      <main className="flex-1">{children}</main>

      {/* 채팅 문의 플로팅 버튼 */}
      <a
        href="http://pf.kakao.com/_Mtxlxdxj/chat"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full shadow-lg hover:bg-yellow-500 transition-all font-semibold text-sm z-50"
      >
        채팅<br/>문의
      </a>

      {/* 후원하기 플로팅 버튼 */}
      {!donationOpen && (
        <button
          onClick={() => setDonationOpen(true)}
          className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-red-700 transition-all font-semibold text-sm z-50"
        >
          후원<br/>문의
        </button>
      )}

      {/* 후원 정보 카드 */}
      {donationOpen && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl p-6 max-w-sm z-50 animate-fadeIn">
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={() => setDonationOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="닫기"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-700">

            <div>
              <p className="font-semibold text-gray-900 mb-1">후원 계좌</p>
              <p>752601-04-331363 (국민은행)</p>
              <p className="text-xs text-gray-600">예금주: 황금종교회(어게인1907평양대부흥)</p>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                *후원된 금액은 전액 집회운영금으로 사용됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative w-full">
        <img
          src="/images/footer.jpg"
          alt="Again 1907 Footer"
          className="w-full h-auto"
        />
      </footer>
    </>
  );
}
