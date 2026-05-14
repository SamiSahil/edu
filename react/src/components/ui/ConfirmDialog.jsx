import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

export function ConfirmDialog({ open, title = 'Confirm action', description, onClose, onConfirm, loading, confirmLabel = 'Confirm', tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-zinc-300">This action requires confirmation and can change stored records.</p>
    </Modal>
  );
}