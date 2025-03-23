import { Dispatch, SetStateAction } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DeletePromptDialogProps {
  title: string;
  content: string;
  displayPrompt: boolean;
}

export const DeleteAccountDialog = ({
  title,
  content,
  displayPrompt,
}: DeletePromptDialogProps) => (
  <Dialog onOpenChange={() => {}} open={displayPrompt}>
    <DialogContent className="sm:max-w-[650px]">
      <DialogHeader>
        <DialogTitle>Delete Account</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        Delete Account
        <div className="text-sm text-gray-500">Delete</div>
      </div>
      <DialogFooter>
        <Button type="submit">Delete Account</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
