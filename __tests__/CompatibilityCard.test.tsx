import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import CompatibilityCard from '../components/CompatibilityCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const base = { category: '리프팅', itemName: '테스트 시술', itemType: 'treatment' as const };

beforeEach(() => jest.mocked(router.push).mockClear());

describe('궁합 카드 (CompatibilityCard)', () => {
  it('로그아웃 상태면 점수 대신 로그인 안내를 보이고, 누르면 로그인으로 보낸다', async () => {
    await render(<CompatibilityCard {...base} profile={null} user={null} />);
    expect(screen.getByText(/로그인 후/)).toBeTruthy();
    await fireEvent.press(screen.getByText('💕 나와의 궁합'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('로그인했지만 피부분석 전이면 피부분석으로 보낸다', async () => {
    await render(<CompatibilityCard {...base} profile={null} user={{ id: 'u1' }} />);
    expect(screen.getByText(/피부분석 후/)).toBeTruthy();
    await fireEvent.press(screen.getByText('💕 나와의 궁합'));
    expect(router.push).toHaveBeenCalledWith('/skin-analysis');
  });
});
