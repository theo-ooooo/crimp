import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

import type { CameraMode } from './LogAttemptSheet';

/**
 * 카메라 시트 (placeholder).
 *
 * - 시각 디자인만 구현. record/shoot 탭 시 Alert 후 시트 닫힘.
 * - TODO(F5): react-native-vision-camera (or expo-camera) 도입 + iOS/Android 권한 + S3 업로드.
 *   업로드 성공 후 mediaId 를 LogAttemptSheet 의 mutation 에 실어 보낼 것.
 *
 * 색 정책: 카메라 시트는 라이트/다크 테마와 무관하게 항상 검은 배경 + 흰 오버레이를
 * 사용하므로(시스템 카메라 앱과 동일) 일부 색은 리터럴로 둔다. 하지만 hold 점·REC
 * 색은 토큰을 재사용한다.
 */

export type CameraSheetProps = {
  visible: boolean;
  mode: CameraMode;
  /**
   * 부모(SessionDetailScreen)가 관리하는 녹화 상태. true 일 때 상단 REC pill /
   * 하단 셔터 inner 가 record 모양으로 변경된다. video 모드 첫 셔터 탭에서 부모가
   * onShoot 핸들러를 통해 true 로 끌어올린다 (Phase 1 placeholder; 실 녹화는 F5).
   */
  recording?: boolean;
  onClose: () => void;
  /**
   * 셔터 탭 콜백. 부모가 video 첫 탭은 recording=true 로, 그 외(사진 / 녹화 종료)는
   * `cameraComingSoon` 안내 + 시트 닫기로 처리한다.
   * F5 에서 실제 캡처 결과(mediaId) 전달로 확장.
   */
  onShoot: () => void;
};

// 화면 내 placeholder 클라이밍 홀드 — 토큰의 hold 팔레트를 재사용.
const FAKE_HOLD_LAYOUT = [
  { colorKey: 'red', leftPct: 22, topPct: 20, size: 28, rotate: 20 },
  { colorKey: 'blue', leftPct: 52, topPct: 35, size: 36, rotate: -15 },
  { colorKey: 'yellow', leftPct: 38, topPct: 55, size: 24, rotate: 5 },
  { colorKey: 'pink', leftPct: 68, topPct: 62, size: 32, rotate: 30 },
  { colorKey: 'green', leftPct: 28, topPct: 78, size: 22, rotate: -10 },
  { colorKey: 'purple', leftPct: 78, topPct: 28, size: 26, rotate: 12 },
] as const;

// 카메라 UI 전용 고정색 — 시스템 카메라 앱처럼 테마 무관하게 동작.
const CAMERA_BG = '#000000';
const CAMERA_FG = '#FFFFFF';

/**
 * 뷰파인더 placeholder 배경 — 어두운 초콜릿 갈색 (gym 벽 연출).
 *
 * F5 후속에서 `react-native-vision-camera` 미리보기 컴포넌트로 교체되면 이 상수는
 * 삭제된다. 디자인 토큰에 포함하지 않는 이유: placeholder 단계에서만 쓰이는
 * 일회성 색이라 시스템 토큰을 오염시키지 않는다.
 */
const VIEWFINDER_PLACEHOLDER_BG = '#1A1410';

export function CameraSheet({
  visible,
  mode,
  recording = false,
  onClose,
  onShoot,
}: CameraSheetProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('session.log.cancel')}
            hitSlop={8}
          >
            <CrimpIcon.close size={20} color={CAMERA_FG} />
          </Pressable>

          {recording ? (
            <View style={styles.recPill}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC · 00:12</Text>
            </View>
          ) : (
            <View style={styles.recSpacer} />
          )}

          <View style={styles.iconBtn}>
            {/* flip placeholder — 새 native dep 추가 없이 정적 아이콘 */}
            <CrimpIcon.dots size={20} color={CAMERA_FG} />
          </View>
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinder}>
          {FAKE_HOLD_LAYOUT.map((h, i) => (
            <View
              key={`${h.colorKey}-${i}`}
              style={[
                styles.fakeHold,
                {
                  backgroundColor: theme.hold[h.colorKey],
                  left: `${h.leftPct}%`,
                  top: `${h.topPct}%`,
                  width: h.size,
                  height: h.size * 0.7,
                  transform: [{ rotate: `${h.rotate}deg` }],
                },
              ]}
            />
          ))}

          {/* focus reticle */}
          <View style={styles.reticle} pointerEvents="none" />

          {/* mode indicator */}
          <View style={styles.modeIndicator}>
            <Text style={styles.modeLabel}>
              {mode === 'video'
                ? t('session.log.cameraVideoTitle')
                : t('session.log.cameraPhotoTitle')}
            </Text>
          </View>
        </View>

        {/* Bottom bar — shutter */}
        <View style={styles.bottomBar}>
          <View style={styles.shutterSide} />

          <Pressable
            onPress={onShoot}
            style={styles.shutter}
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'video'
                ? t('session.log.cameraVideoTitle')
                : t('session.log.cameraPhotoTitle')
            }
          >
            <View style={styles.shutterRing} />
            <View
              style={[
                styles.shutterInner,
                mode === 'video'
                  ? recording
                    ? styles.shutterInnerVideoRecording
                    : styles.shutterInnerVideo
                  : styles.shutterInnerPhoto,
              ]}
            />
          </Pressable>

          <View style={styles.shutterSide} />
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  // hold 매트 톤이 아닌 진하게 강조된 댄저(흰 + 빨간 점) — semantic.danger 재사용
  const recBg = withAlpha(theme.semantic.danger, 0.92);
  // 카메라 UI 의 글래스 morphism 스타일 버튼 — 흰색에 알파를 입혀 톤만 조정
  const glassBg = withAlpha(CAMERA_FG, 0.16);
  // 모드 인디케이터 배경 — 검은색에 알파
  const overlayBg = withAlpha(CAMERA_BG, 0.4);
  // reticle 테두리 — 흰색 알파
  const reticleBorder = withAlpha(CAMERA_FG, 0.7);

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: CAMERA_BG,
    },
    topBar: {
      paddingTop: space[10] + space[4],
      paddingHorizontal: space[4],
      paddingBottom: space[2],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: glassBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recPill: {
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: recBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
    },
    recDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: CAMERA_FG,
    },
    recText: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.extrabold,
      color: CAMERA_FG,
      letterSpacing: 0.48,
    },
    recSpacer: {
      width: 1,
      height: 1,
    },
    viewfinder: {
      flex: 1,
      // F5 에서 카메라 미리보기 컴포넌트로 교체. 그 전까지 placeholder 색 사용.
      backgroundColor: VIEWFINDER_PLACEHOLDER_BG,
      position: 'relative',
      overflow: 'hidden',
    },
    fakeHold: {
      position: 'absolute',
      borderTopLeftRadius: 50,
      borderTopRightRadius: 50,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    reticle: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 80,
      height: 80,
      marginLeft: -40,
      marginTop: -40,
      borderWidth: 1.5,
      borderColor: reticleBorder,
      borderRadius: radius.sm,
    },
    modeIndicator: {
      position: 'absolute',
      bottom: space[4],
      left: space[4],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      backgroundColor: overlayBg,
      borderRadius: radius.md,
    },
    modeLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: CAMERA_FG,
    },
    bottomBar: {
      paddingHorizontal: space[6],
      paddingBottom: space[14],
      paddingTop: space[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: CAMERA_BG,
    },
    shutterSide: {
      width: 50,
      height: 50,
    },
    shutter: {
      width: 78,
      height: 78,
      borderRadius: 39,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 39,
      borderWidth: 4,
      borderColor: CAMERA_FG,
    },
    shutterInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    shutterInnerVideo: {
      backgroundColor: theme.semantic.danger,
    },
    shutterInnerVideoRecording: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: theme.semantic.danger,
    },
    shutterInnerPhoto: {
      backgroundColor: CAMERA_FG,
    },
  });
}
