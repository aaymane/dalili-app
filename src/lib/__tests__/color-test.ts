import { mix, wash } from '../color';

describe('mix', () => {
  it('donne chaque couleur aux deux bouts, et le milieu entre les deux', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('ignore une transparence déjà présente', () => {
    expect(mix('#F59E0B55', '#F59E0B', 0.5)).toBe('#f59e0b');
  });
});

describe('wash', () => {
  it('finit exactement sur le fond de page, pour ne laisser aucun bord', () => {
    const [, , last] = wash('#E11D48', '#070B18');
    expect(last).toBe('#070B18');
  });
});
