declare module 'react-native-vector-icons/*' {
  import type { ComponentType } from 'react';
  import type { TextProps, StyleProp, TextStyle } from 'react-native';
  type IconProps = TextProps & {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  };
  const Icon: ComponentType<IconProps>;
  export default Icon;
}
