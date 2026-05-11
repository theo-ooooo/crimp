import React, { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { ProfileDeleteAccountConfirmModal } from '@/components/profile/ProfileDeleteAccountConfirmModal';
import type { ProfileStyles } from '@/components/profile/profileStyles';
import { useDeleteAccount } from '@/hooks/queries/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';

type Props = {
  styles: ProfileStyles;
};

export function ProfileDeleteAccountButton({ styles }: Props): JSX.Element {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const deleteAccount = useDeleteAccount();

  const openModal = useCallback(() => {
    deleteAccount.reset();
    setModalVisible(true);
  }, [deleteAccount]);

  const closeModal = useCallback(() => {
    if (deleteAccount.isPending) {
      return;
    }
    setModalVisible(false);
  }, [deleteAccount.isPending]);

  const confirmDelete = useCallback(() => {
    if (!deleteAccount.isPending) {
      deleteAccount.mutate();
    }
  }, [deleteAccount]);

  return (
    <>
      <Pressable
        onPress={openModal}
        disabled={deleteAccount.isPending}
        accessibilityRole="button"
        accessibilityLabel={t('profile.deleteAccount')}
        style={({ pressed }) => [
          styles.deleteAccountButton,
          pressed ? styles.deleteAccountButtonPressed : null,
          deleteAccount.isPending ? styles.deleteAccountButtonDisabled : null,
        ]}
      >
        <Text style={styles.deleteAccountButtonLabel}>
          {deleteAccount.isPending ? t('profile.deleteAccountLoading') : t('profile.deleteAccount')}
        </Text>
      </Pressable>
      <ProfileDeleteAccountConfirmModal
        visible={modalVisible}
        saving={deleteAccount.isPending}
        errorMessage={deleteAccount.error ? toUserMessage(deleteAccount.error) : null}
        onCancel={closeModal}
        onConfirm={confirmDelete}
      />
    </>
  );
}
