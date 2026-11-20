import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { User } from '../types';
import { Avatar } from './Avatar';
import { CameraIcon, CloseIcon, LogoutIcon, MoonIcon, SunIcon } from './Icons';

export function SettingsModal() {
  const open = useStore((state) => state.settingsOpen);
  const user = useStore((state) => state.user);

  if (!open || !user) return null;
  return <SettingsDialog user={user} />;
}

function SettingsDialog({ user }: { user: User }) {
  const close = useStore((state) => state.closeSettings);
  const saveProfile = useStore((state) => state.saveProfile);
  const saveAvatar = useStore((state) => state.saveAvatar);
  const logout = useStore((state) => state.logout);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await saveProfile(name.trim(), bio.trim());
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File) {
    setAvatarLoading(true);
    try {
      await saveAvatar(file);
    } finally {
      setAvatarLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h3>Настройки</h3>
          <button type="button" className="icon-btn" onClick={close} title="Закрыть">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-profile">
            <div className="settings-avatar">
              <Avatar user={user} size={90} />
              <button
                type="button"
                className="avatar-edit"
                onClick={() => fileRef.current?.click()}
                title="Сменить аватар"
                disabled={avatarLoading}
              >
                {avatarLoading ? <span className="mini-spinner light" /> : <CameraIcon size={18} />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleAvatar(file);
                  event.target.value = '';
                }}
              />
            </div>

            <div className="settings-fields">
              <label className="field compact">
                <span>Имя</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={64} />
              </label>
              <label className="field compact">
                <span>О себе</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Пара слов о вас"
                />
              </label>
            </div>
          </section>

          <section className="settings-rows">
            <div className="settings-row">
              <span>Имя пользователя</span>
              <b>@{user.username}</b>
            </div>
            <div className="settings-row">
              <span>Телефон</span>
              <b>{user.phone ?? '—'}</b>
            </div>
          </section>

          <section>
            <h4 className="settings-section-title">Оформление</h4>
            <div className="theme-switch">
              <button
                type="button"
                className={theme === 'light' ? 'is-active' : ''}
                onClick={() => setTheme('light')}
              >
                <SunIcon size={19} />
                Светлая
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'is-active' : ''}
                onClick={() => setTheme('dark')}
              >
                <MoonIcon size={19} />
                Тёмная
              </button>
            </div>
          </section>

          <button
            type="button"
            className="btn-primary"
            onClick={() => void submit()}
            disabled={saving || !name.trim() || (name.trim() === user.name && bio.trim() === user.bio)}
          >
            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
          </button>
        </div>

        <footer className="settings-foot">
          <button type="button" className="btn-danger-ghost" onClick={logout}>
            <LogoutIcon size={18} />
            Выйти из аккаунта
          </button>
          <span className="settings-version">Telegram Web · demo</span>
        </footer>
      </div>
    </div>
  );
}
