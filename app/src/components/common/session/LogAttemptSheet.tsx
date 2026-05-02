import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';

import {
  CrimpIcon,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  ResultMark,
} from '@/components/common/primitives';
import type { HoldColorKey } from '@/components/common/primitives';
import { useLogAttempt } from '@/hooks/queries/useAttempts';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { type AttemptResult } from '@/lib/schemas/attempt';
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

/**
 * 시도 기록 시트 (v2 디자인).
 *
 * - Result 4그리드 (SEND/FLASH/TRY/FAIL): 디자인이 4개만 노출하므로 ONSIGHT 는 시트에서 제외.
 *   ONSIGHT 가 필요해지면 4→5그리드로 확장하거나 별도 토글을 둔다.
 * - 그레이드 horizontal scroll · 홀드 색 · 카메라 CTA · 메모 · 저장.
 * - 카메라 CTA 는 onCamera 콜백을 통해 부모(시트 호스트)가 CameraSheet 를 띄우게 한다.
 *   실제 캡처/업로드는 F5 후속 작업 (TODO: 실 카메라/업로드 연동).
 */

export type CameraMode = 'video' | 'photo';

const SHEET_RESULTS = ['SEND', 'FLASH', 'TRY', 'FAIL'] as const satisfies ReadonlyArray<AttemptResult>;

const GRADE_OPTIONS = [
  'V0',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7',
  'V8',
] as const;

const HOLD_OPTIONS: ReadonlyArray<HoldColorKey> = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'black',
  'pink',
  'orange',
  'purple',
  'gray',
];

export type LogAttemptSheetProps = {
  visible: boolean;
  accessToken: string;
  sessionExtId: string;
  onClose: () => void;
  onCamera: (mode: CameraMode) => void;
  /**
   * 카메라/업로드 흐름이 완료된 미디어의 백엔드 id (PR #92, F5 PR-3). 저장 시 본 값을
   * `mediaId` 로 첨부해 attempt 와 미디어를 영구 연결. null 이면 미첨부 상태.
   */
  attachedMediaId?: number | null;
  /**
   * (PR #115 후속) 업로드 진행 중 상태 — 캡처 후 presign+S3 PUT+complete 완료 전까지.
   * 시트 안에서 인라인 spinner 표시 (별 Modal 은 nested 겹침으로 안 보였음).
   */
  uploading?: boolean;
  /**
   * 첨부 표시·영구 연결 상태에서 사용자가 "다시 촬영" 같은 액션으로 미디어를 해제할 때
   * 부모 상태 (uploaded media) 를 비우도록 알림. 본 PR 에선 호출 진입점만 마련, 실제
   * UI 토글은 후속에서 보강.
   */
  onClearMedia?: () => void;
};

export function LogAttemptSheet({
  visible,
  accessToken,
  sessionExtId,
  onClose,
  onCamera,
  attachedMediaId = null,
  uploading = false,
  onClearMedia,
}: LogAttemptSheetProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const mutation = useLogAttempt(accessToken, sessionExtId);

  const [result, setResult] = useState<AttemptResult>('SEND');
  const [grade, setGrade] = useState<string>('V5');
  const [hold, setHold] = useState<HoldColorKey>('red');
  const [note, setNote] = useState<string>('');

  const reset = () => {
    setResult('SEND');
    setGrade('V5');
    setHold('red');
    setNote('');
    if (onClearMedia) onClearMedia();
  };

  const onSave = () => {
    const trimmed = note.trim();
    mutation.mutate(
      {
        result,
        attempts: 1,
        gradeValue: grade,
        note: trimmed.length > 0 ? trimmed : null,
        // [PR #93, F5 PR-4] hold 색을 1급 컬럼 holdColor 로 전송 (이전엔 tagsJson 안의 JSON).
        holdColor: hold,
        // [PR #92, F5 PR-3] 카메라/업로드 흐름 완료 시 media id 를 attempt 에 연결.
        mediaId: attachedMediaId,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    if (mutation.isPending) {
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel={t('session.log.cancel')}
        />
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{t('session.log.title')}</Text>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('session.log.cancel')}
              hitSlop={8}
            >
              <Text style={styles.cancel}>{t('session.log.cancel')}</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Result */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('session.log.resultLabel')}</Text>
              <View style={styles.resultGrid}>
                {SHEET_RESULTS.map((r) => {
                  const active = r === result;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setResult(r)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={t(`attempt.result.${r}` as const)}
                      style={pressableNeutralStyle}
                    >
                      <View
                        style={[
                          styles.resultCell,
                          active ? styles.resultCellActive : null,
                        ]}
                      >
                        <ResultMark kind={r} size={28} />
                        <Text
                          style={[
                            styles.resultLabel,
                            active ? styles.resultLabelActive : null,
                          ]}
                        >
                          {r}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Grade */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('session.log.gradeLabel')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gradeRow}
              >
                {GRADE_OPTIONS.map((v) => {
                  const active = v === grade;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setGrade(v)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Grade ${v}`}
                      // 그레이드 셀 자체는 ~50dp 이지만 horizontal scroll 안에서 손가락
                      // 정밀도가 떨어진다. 44dp 권고치 확보 + 양쪽 셀 침범 방지를 위해
                      // 좌우 hitSlop 은 작게 (3) 위·아래는 넉넉히 (8).
                      hitSlop={{ top: 8, bottom: 8, left: 3, right: 3 }}
                      style={pressableNeutralStyle}
                    >
                      <View
                        style={[
                          styles.gradeCell,
                          active ? styles.gradeCellActive : null,
                        ]}
                      >
                        <GradeBadge v={v} size="lg" />
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Hold color */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('session.log.holdLabel')}</Text>
              <View style={styles.holdRow}>
                {HOLD_OPTIONS.map((c) => {
                  const active = c === hold;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setHold(c)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Hold ${c}`}
                      // 홀드 셀 40dp → 44dp 권고치까지 hitSlop 으로 보강.
                      // 양옆 셀 간격(space[2]=8) 의 절반 미만으로 두어 인접 셀 침범 회피.
                      hitSlop={2}
                      style={pressableNeutralStyle}
                    >
                      <View
                        style={[
                          styles.holdCell,
                          active ? styles.holdCellActive : null,
                        ]}
                      >
                        <HoldDot color={c} size={26} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Camera CTA */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('session.log.mediaLabel')}</Text>
              {uploading ? (
                // (PR #115 후속) 업로드 진행 중 — 카메라 CTA 자리를 spinner + 라벨로 대체.
                // 사용자가 캡처 직후 '아무 반응 없음' 을 느꼈던 회귀 차단. 별 Modal 오버레이는
                // LogAttemptSheet Modal 위에 nested 라 iOS 가 가려서 의미 없었음.
                <View style={styles.attachedRow}>
                  <View style={styles.attachedBadge}>
                    <ActivityIndicator color={theme.accent.base} />
                    <Text style={styles.attachedLabel}>
                      {t('session.log.uploading')}
                    </Text>
                  </View>
                </View>
              ) : attachedMediaId !== null ? (
                // [PR #92, F5 PR-3] 미디어 첨부 완료 — 두 셀 대신 첨부 표시 + 다시 촬영 버튼.
                <View style={styles.attachedRow}>
                  <View style={styles.attachedBadge}>
                    <CrimpIcon.check size={18} color={theme.semantic.success} />
                    <Text style={styles.attachedLabel}>
                      {t('session.log.mediaAttached')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onClearMedia?.()}
                    accessibilityRole="button"
                    accessibilityLabel={t('session.log.mediaClear')}
                    hitSlop={8}
                  >
                    <Text style={styles.attachedClear}>
                      {t('session.log.mediaClear')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cameraRow}>
                  <Pressable
                    onPress={() => onCamera('video')}
                    accessibilityRole="button"
                    accessibilityLabel={t('session.log.cameraVideoTitle')}
                    style={pressableFlexStyle}
                  >
                    <View style={styles.cameraCell}>
                      <View style={styles.cameraIconWrap}>
                        <CrimpIcon.play size={22} color={theme.text2} />
                      </View>
                      <Text style={styles.cameraTitle}>
                        {t('session.log.cameraVideoTitle')}
                      </Text>
                      <Text style={styles.cameraHint}>
                        {t('session.log.cameraVideoHint')}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => onCamera('photo')}
                    accessibilityRole="button"
                    accessibilityLabel={t('session.log.cameraPhotoTitle')}
                    style={pressableFlexStyle}
                  >
                    <View style={styles.cameraCell}>
                      <View style={styles.cameraIconWrap}>
                        <CrimpIcon.target size={22} color={theme.text2} />
                      </View>
                      <Text style={styles.cameraTitle}>
                        {t('session.log.cameraPhotoTitle')}
                      </Text>
                      <Text style={styles.cameraHint}>
                        {t('session.log.cameraPhotoHint')}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Note */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('session.log.noteLabel')}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={300}
                placeholder={t('session.log.notePlaceholder')}
                placeholderTextColor={theme.text4}
                style={styles.noteInput}
                accessibilityLabel={t('session.log.noteLabel')}
              />
            </View>

            {mutation.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBody}>
                  {toUserMessage(mutation.error)}
                </Text>
              </View>
            ) : null}

            {/* Save */}
            <View style={styles.saveWrap}>
              {mutation.isPending ? (
                <View style={styles.pendingRow}>
                  <ActivityIndicator color={theme.accent.base} />
                </View>
              ) : (
                <PrimaryButton
                  onPress={onSave}
                  accessibilityLabel={t('session.log.save')}
                >
                  {t('session.log.save')}
                </PrimaryButton>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Pressable 의 RN style prop 은 함수형이 권장 — pressed 시각 피드백을 토큰 일관성 있게 처리.
function pressableNeutralStyle({ pressed }: PressableStateCallbackType): ViewStyle {
  return pressed ? { opacity: 0.85 } : {};
}

function pressableFlexStyle({ pressed }: PressableStateCallbackType): ViewStyle {
  return pressed ? { flex: 1, opacity: 0.85 } : { flex: 1 };
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      // 짙은 잉크 토큰(accent.ink) 에 알파 50% — 라이트/다크 공통으로 시트 뒤를 어둡게.
      backgroundColor: withAlpha(theme.accent.ink, 0.5),
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radius['2xl'],
      borderTopRightRadius: radius['2xl'],
      paddingTop: space[3],
      paddingBottom: space[10],
      maxHeight: '92%',
      overflow: 'hidden',
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.text4,
      alignSelf: 'center',
      marginBottom: space[4],
    },
    header: {
      paddingHorizontal: space[5],
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: space[4],
    },
    title: {
      fontFamily,
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.66,
    },
    cancel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: space[4],
    },
    section: {
      paddingHorizontal: space[5],
      marginBottom: space[5],
      gap: space[2],
    },
    sectionLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.text3,
      letterSpacing: 0.48,
    },
    resultGrid: {
      flexDirection: 'row',
      gap: space[2],
    },
    resultCell: {
      flex: 1,
      paddingVertical: space[3],
      paddingHorizontal: space[2],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[1],
    },
    resultCellActive: {
      backgroundColor: theme.text,
    },
    resultLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.extrabold,
      color: theme.text2,
      letterSpacing: 0.36,
    },
    resultLabelActive: {
      color: theme.bg,
    },
    gradeRow: {
      flexDirection: 'row',
      gap: space[1],
      paddingBottom: space[1],
      paddingRight: space[5],
    },
    gradeCell: {
      padding: space[1],
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    gradeCellActive: {
      // 라임은 배경 대비 luminance 가 높아 단색 outline 만으로는 활성 상태 식별이
      // 약하다. accent.soft 배경을 함께 깔아 톤 차이로 보강 (라이트/다크 공통).
      borderColor: theme.accent.base,
      backgroundColor: theme.accent.soft,
    },
    holdRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    holdCell: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    holdCellActive: {
      // grade 와 동일한 이유 — 라임 단색 outline 만으로는 약하므로 soft 배경 보강.
      // 둥근 셀이라도 hold 점은 중앙에 26dp 작게 배치되어 주변에 충분한 여백이 있다.
      borderColor: theme.accent.base,
      backgroundColor: theme.accent.soft,
    },
    cameraRow: {
      flexDirection: 'row',
      gap: space[2],
    },
    attachedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space[3],
      paddingVertical: space[3],
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: 'solid',
      borderColor: theme.semantic.success,
      backgroundColor: withAlpha(theme.semantic.success, 0.08),
    },
    attachedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    attachedLabel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    attachedClear: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
      textDecorationLine: 'underline',
    },
    cameraCell: {
      height: 96,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.hairline,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[1],
      paddingHorizontal: space[2],
    },
    cameraIconWrap: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.text2,
      letterSpacing: -0.13,
    },
    cameraHint: {
      fontFamily,
      fontSize: 10,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    noteInput: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingTop: space[3],
      paddingBottom: space[3],
      minHeight: 72,
      color: theme.text,
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      textAlignVertical: 'top',
    },
    errorBox: {
      marginHorizontal: space[5],
      marginBottom: space[4],
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.md,
      padding: space[3],
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.semantic.danger,
      fontWeight: fontWeight.semibold,
    },
    saveWrap: {
      paddingHorizontal: space[5],
    },
    pendingRow: {
      paddingVertical: space[3],
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
