import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme/scheme';
import { fonts, radius } from '@/theme/tokens';

import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  icon?: ReactNode;
  right?: ReactNode;
  error?: string | null;
  dark?: boolean;
  multiline?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Champ de saisie : label au-dessus de la valeur (style du prototype), bordure animée au focus. */
export function Input({ label, icon, right, error, dark, multiline, style, onFocus, onBlur, ref, ...rest }: Props) {
  const { c } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const border = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? c.danger : focused ? c.electric : dark ? 'transparent' : c.line, { duration: 180 }),
  }));
  return (
    <View style={{ gap: 6 }}>
      <Animated.View style={[styles.box, multiline && { minHeight: 110, alignItems: 'flex-start', paddingTop: 12 }, border]}>
        {icon && <View style={[styles.icon, multiline && { marginTop: 2 }]}>{icon}</View>}
        <View style={{ flex: 1 }}>
          {label ? (
            <Text variant="overline" color={c.muted} style={{ fontSize: 9, marginBottom: 1 }}>
              {label}
            </Text>
          ) : null}
          <TextInput
            ref={ref}
            placeholderTextColor={c.muted}
            multiline={multiline}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.input, multiline && { textAlignVertical: 'top', minHeight: 70 }, style]}
            {...rest}
          />
        </View>
        {right}
      </Animated.View>
      {error ? (
        <Text variant="small" color={c.danger} style={{ marginLeft: 6 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1.5,
  },
  icon: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.electricSoft, alignItems: 'center', justifyContent: 'center' },
  input: { fontFamily: fonts.body, fontSize: 15, color: c.navy, paddingVertical: 2, outlineStyle: 'none' } as any,
}));
