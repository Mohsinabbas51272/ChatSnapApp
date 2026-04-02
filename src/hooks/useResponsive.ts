import { useWindowDimensions, Platform, DimensionValue, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useResponsive = () => {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const isTablet = width >= 768;
    const isSmallPhone = width < 375;
    const isLandscape = width > height;

    // Design-specific constants
    const MAX_CONTENT_WIDTH = 768;
    const contentWidth = isTablet ? MAX_CONTENT_WIDTH : width;
    const horizontalPadding = isTablet ? (width - MAX_CONTENT_WIDTH) / 2 : 0;

    // Layout helper
    const getResponsiveContainerStyle = (): ViewStyle => ({
        flex: 1,
        width: '100%' as DimensionValue,
        maxWidth: isTablet ? MAX_CONTENT_WIDTH : undefined,
        alignSelf: 'center' as const,
    });

    return {
        width,
        height,
        insets,
        isTablet,
        isSmallPhone,
        isLandscape,
        contentWidth,
        horizontalPadding,
        getResponsiveContainerStyle,
    };
};
