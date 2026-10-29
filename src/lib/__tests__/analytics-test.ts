const mockCapture = jest.fn();
const mockScreen = jest.fn();
const mockRegister = jest.fn(async () => {});
const mockOptIn = jest.fn(async () => {});
const mockOptOut = jest.fn(async () => {});
jest.mock('posthog-react-native', () => jest.fn().mockImplementation(() => ({ capture: mockCapture, screen: mockScreen, register: mockRegister, optIn: mockOptIn, optOut: mockOptOut })));

/** Recharge le module avec (ou sans) clé PostHog, comme une app construite avec ou sans `EXPO_PUBLIC_POSTHOG_KEY`. */
function load(key: string) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_POSTHOG_KEY = key;
  process.env.EXPO_PUBLIC_POSTHOG_IN_DEV = '1';
  // require() : le module doit être relu après le changement de clé (jest.resetModules), un import ne le permet pas.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../analytics') as typeof import('../analytics');
}

describe('statistiques anonymes', () => {
  beforeEach(() => [mockCapture, mockScreen, mockRegister, mockOptIn, mockOptOut].forEach((f) => f.mockClear()));

  it('sans clé : rien n’est envoyé, même avec un « oui »', () => {
    const a = load('');
    expect(a.analyticsAvailable).toBe(false);
    a.useAnalyticsConsent.getState().setConsent('yes');
    a.track('ai_question_asked');
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('avec clé mais sans accord : rien n’est envoyé', () => {
    const a = load('phc_test');
    a.track('guide_opened', { slug: 'caf' });
    a.trackScreen(['(app)', 'messages', '[id]']);
    expect(mockCapture).not.toHaveBeenCalled();
    expect(mockScreen).not.toHaveBeenCalled();
  });

  it('« oui » : les événements de la liste partent, les écrans par leur modèle de route', () => {
    const a = load('phc_test');
    a.useAnalyticsConsent.getState().setConsent('yes');
    expect(mockOptIn).toHaveBeenCalled();
    a.track('step_toggled', { step: 'visa', done: true });
    a.trackScreen(['(app)', 'messages', '[id]']);
    expect(mockCapture).toHaveBeenCalledWith('step_toggled', { step: 'visa', done: true });
    expect(mockScreen).toHaveBeenCalledWith('messages/[id]');
  });

  it('« non » coupe l’envoi', () => {
    const a = load('phc_test');
    a.useAnalyticsConsent.getState().setConsent('no');
    expect(mockOptOut).toHaveBeenCalled();
    a.track('mentor_request_sent');
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
