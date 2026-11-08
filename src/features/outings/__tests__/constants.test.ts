import { Constants, OUTING_STATUS_CONFIG } from '@/shared/types';
import { OUTING_STATUS_OPTIONS } from '../constants';

describe('OUTING_STATUS_OPTIONS', () => {
  it('lists every outing status in enum order with its label and emoji', () => {
    expect(OUTING_STATUS_OPTIONS.map((o) => o.value)).toEqual(Constants.public.Enums.outing_status);
    OUTING_STATUS_OPTIONS.forEach((option) => {
      expect(option.label).toBe(OUTING_STATUS_CONFIG[option.value].label);
      expect(option.emoji).toBe(OUTING_STATUS_CONFIG[option.value].emoji);
    });
  });
});
