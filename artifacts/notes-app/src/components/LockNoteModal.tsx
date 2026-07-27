import React, { useState, useEffect } from 'react';
import { Lock, LockOpen, Eye, EyeOff } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LockNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'set' = set a new password, 'verify' = verify to unlock, 'remove' = confirm to remove password */
  mode: 'set' | 'verify' | 'remove';
  noteTitle?: string;
  isLocked?: boolean;
  onSetPassword: (password: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<boolean>;
  onRemovePassword: (password: string) => Promise<void>;
  onVerified?: () => void;
}

export default function LockNoteModal({
  open, onOpenChange, mode, noteTitle, isLocked,
  onSetPassword, onVerifyPassword, onRemovePassword, onVerified
}: LockNoteModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    if (!password) { setError('Please enter a password.'); return; }

    setLoading(true);
    try {
      if (mode === 'set') {
        if (password !== confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }
        if (password.length < 4) { setError('Password must be at least 4 characters.'); setLoading(false); return; }
        await onSetPassword(password);
        onOpenChange(false);
      } else if (mode === 'verify') {
        const valid = await onVerifyPassword(password);
        if (!valid) { setError('Incorrect password. Try again.'); setLoading(false); return; }
        onVerified?.();
        onOpenChange(false);
      } else if (mode === 'remove') {
        const valid = await onVerifyPassword(password);
        if (!valid) { setError('Incorrect password. Try again.'); setLoading(false); return; }
        await onRemovePassword(password);
        onOpenChange(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const titles = {
    set: isLocked ? 'Change Password' : 'Lock Note',
    verify: 'Enter Password',
    remove: 'Remove Password',
  };

  const descriptions = {
    set: `Protect "${noteTitle || 'this note'}" with a password.`,
    verify: `"${noteTitle || 'This note'}" is password-protected.`,
    remove: `Enter the current password to remove protection from "${noteTitle || 'this note'}".`,
  };

  const icons = {
    set: Lock,
    verify: Lock,
    remove: LockOpen,
  };

  const Icon = icons[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Icon size={18} className="text-primary" />
            {titles[mode]}
          </DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="lock-password">
              {mode === 'remove' ? 'Current password' : 'Password'}
            </Label>
            <div className="relative">
              <Input
                id="lock-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password..."
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'set' && (
            <div className="space-y-1.5">
              <Label htmlFor="lock-confirm">Confirm password</Label>
              <Input
                id="lock-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Confirm password..."
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {mode === 'verify' ? 'Unlock' : mode === 'remove' ? 'Remove Lock' : 'Lock Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
