/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '../constants/theme';
import { useColorScheme } from './use-color-scheme';

const FALLBACK = {
  light: {
    text: '#0B0B0F',
    background: '#FFFFFF',
  },
  dark: {
    text: Colors.textPrimary,
    background: Colors.background,
  },
};

export function useThemeColor(props, colorName) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props?.[theme];
  if (colorFromProps) return colorFromProps;

  return (FALLBACK[theme] && FALLBACK[theme][colorName]) || FALLBACK.dark[colorName];
}

