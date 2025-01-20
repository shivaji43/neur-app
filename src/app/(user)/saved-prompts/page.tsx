'use client';

import React, { SetStateAction, useEffect, useState } from 'react';

import { SavedPrompt } from '@prisma/client';
import { motion } from 'framer-motion';
import { Loader2, Pencil, Plus, Search, Star, Trash } from 'lucide-react';
import { toast } from 'sonner';

import { Combobox } from '@/components/dropdown-selector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/use-user';

const filterOptions = [
  {
    value: 'recentlyUsed',
    label: 'Recently Used',
  },
  {
    value: 'editedRecently',
    label: 'Edited Recently',
  },
  {
    value: 'latest',
    label: 'Newest First',
  },
  {
    value: 'oldest',
    label: 'Oldest First',
  },
  {
    value: 'favorites',
    label: 'Favorites',
  },
];

export type FilterValues =
  | 'recentlyUsed'
  | 'editedRecently'
  | 'latest'
  | 'oldest'
  | 'favorites';

interface ManagePromptAction {
  action: 'update' | 'delete' | 'save' | null;
  id: string | null;
}

interface DeleteDialogBoxProps {
  promptAction: ManagePromptAction;
  setPromptAction: React.Dispatch<SetStateAction<ManagePromptAction>>;
  handleDeletePrompt: () => Promise<void>;
}

interface EditPromptDialogBoxProps {
  promptAction: ManagePromptAction;
  setPromptAction: React.Dispatch<SetStateAction<ManagePromptAction>>;
  handleEditPrompt: () => Promise<void>;
  handleSavePrompt: () => Promise<void>;
  title: string;
  content: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
}

function DeleteDialogBox({
  promptAction,
  setPromptAction,
  handleDeletePrompt,
}: DeleteDialogBoxProps) {
  return (
    <AlertDialog
      open={promptAction.action === 'delete'}
      onOpenChange={() =>
        promptAction.action !== null &&
        setPromptAction({ action: null, id: null })
      }
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the saved
            prompt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeletePrompt}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditPromptDialogBox({
  promptAction,
  setPromptAction,
  handleEditPrompt,
  handleSavePrompt,
  title,
  content,
  setTitle,
  setContent,
  isLoading,
}: EditPromptDialogBoxProps) {
  return (
    <Dialog
      onOpenChange={() => {
        if (promptAction.action !== null) {
          setPromptAction({ action: null, id: null });
        } else {
          setTitle('');
          setContent('');
        }
      }}
      open={promptAction.action === 'save' || promptAction.action === 'update'}
    >
      <DialogTrigger asChild>
        <Button
          onClick={() => setPromptAction({ action: 'save', id: null })}
          variant="secondary"
          disabled={isLoading}
        >
          Add Prompt <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {promptAction.action === 'update' ? 'Edit' : 'Add'} Prompt
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input
            autoComplete="off"
            id="name"
            type="text"
            value={title}
            placeholder="Title"
            onChange={(e) => setTitle(e.target.value)}
            className="col-span-3"
          />
          <Textarea
            id="username"
            value={content}
            rows={4}
            placeholder="Prompt"
            onChange={(e) => setContent(e.target.value)}
            className="col-span-3"
          />
        </div>
        <DialogFooter>
          <Button
            disabled={isLoading}
            onClick={
              promptAction.action === 'update'
                ? handleEditPrompt
                : handleSavePrompt
            }
            type="submit"
          >
            Save {promptAction.action === 'update' ? 'Changes' : 'Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SavedPromptsPage() {
  const [filter, setFilter] = useState<FilterValues>('recentlyUsed');
  const [search, setSearch] = useState<string>('');
  /**
   * To resuse the same dialog for both update and delete actions,
   * promptAction tracks what action is to be performed in which prompt (based on id)
   */
  const [promptAction, setPromptAction] = useState<{
    action: 'update' | 'delete' | 'save' | null;
    id: string | null;
  }>({ action: null, id: null });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [primaryFilteredPrompts, setPrimaryFilteredPrompts] = useState<
    SavedPrompt[]
  >([]); // Primary Filter : To filter based on filter options, e.g. Recently used (or) Edited recently
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const { user } = useUser();

  useEffect(() => {
    async function fetchSavedPrompts() {
      try {
        const res = await fetch('/api/saved-prompts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        setSavedPrompts(data);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    fetchSavedPrompts();
  }, []);

  useEffect(() => {
    const sortPrompts = () => {
      let sorted = [...savedPrompts];

      if (filter === 'recentlyUsed') {
        sorted.sort((a, b) => {
          const dateA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const dateB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return dateB - dateA;
        });
      } else if (filter === 'editedRecently') {
        sorted.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });
      } else if (filter === 'latest') {
        sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      } else if (filter === 'oldest') {
        sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
      } else if (filter === 'favorites') {
        sorted = sorted.filter((prompt) => prompt.favorite);
      }

      setPrimaryFilteredPrompts(sorted);
    };

    sortPrompts();
  }, [filter, savedPrompts]);

  async function handleSavePrompt() {
    if (!user) {
      toast.error('Unauthorized');
      return;
    }
    if (!title.trim()) {
      toast.error('Title cannot be empty');
      return;
    } else if (!content.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }
    setIsLoading(true);
    toast.promise(
      fetch('/api/saved-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim(),
          content: content.trim(),
        }),
      })
        .then(async (response) => {
          const data = await response.json();
          setSavedPrompts((old) => {
            return [...old, data];
          });
          setPromptAction({ action: null, id: null });
        })
        .catch((error) => {
          console.error('Failed to save prompt:', { error });
        }),
      {
        loading: 'Saving prompt ...',
        success: 'Saved prompt successful',
        error: 'Failed to save prompt',
      },
    );

    setIsLoading(false);
  }

  async function handleDeletePrompt() {
    if (promptAction.id === '') return;
    setIsLoading(true);
    toast.promise(
      fetch('/api/saved-prompts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: promptAction.id,
        }),
      })
        .then(() => {
          setPromptAction({ action: null, id: null });
          setSavedPrompts((old) =>
            old.filter((element) => element.id !== promptAction.id),
          );
        })
        .catch((error) => {
          console.error('Failed to delete prompt:', error);
        }),
      {
        loading: 'Deleting prompt ...',
        success: 'Prompt deleted successfully',
        error: 'Failed to delete prompt',
      },
    );

    setIsLoading(false);
  }

  async function handleEditPrompt() {
    if (promptAction.id === '') return;

    if (!title.trim()) {
      toast.error('Title cannot be empty');
      return;
    } else if (!content.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }
    setIsLoading(true);
    toast.promise(
      fetch('/api/saved-prompts/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: promptAction.id,
          title: title.trim(),
          content: content.trim(),
        }),
      })
        .then(() => {
          setPromptAction({ action: null, id: null });
          setSavedPrompts((old) =>
            old.map((element) =>
              element.id === promptAction.id
                ? { ...element, title: title.trim(), content: content.trim() }
                : element,
            ),
          );
        })
        .catch((error) => {
          console.error('Failed to edit prompt:', error);
        }),
      {
        loading: 'Editing prompt ...',
        success: 'Prompt edited successfully',
        error: 'Failed to edit prompt',
      },
    );
    setIsLoading(false);
  }

  async function handleAddToFavorites(id: string, favorite: boolean) {
    toast.promise(
      fetch('/api/saved-prompts/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          favorite,
        }),
      })
        .then(() => {
          setPromptAction({ action: null, id: null });
          setSavedPrompts((old) =>
            old.map((element) =>
              element.id === id ? { ...element, favorite } : element,
            ),
          );
        })
        .catch((error) => {
          console.error('Failed to add prompt to favorites:', error);
        }),
      {
        loading: 'Adding to favorite ...',
        success: 'Prompt added to favorites',
        error: 'Failed to add to favorites',
      },
    );
  }

  // Secondary Filter : to filter based on the search term entered by the user in search bar
  const secondaryFilteredPrompts =
    search !== ''
      ? primaryFilteredPrompts.filter((prompt) =>
          prompt.title.toLowerCase().includes(search.toLowerCase()),
        )
      : primaryFilteredPrompts;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 py-12">
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          placeholder="Search"
        />
      </div>
      <div className="flex flex-row items-center gap-4">
        <Combobox
          disabled={isLoading}
          filter={filter}
          setFilter={setFilter}
          filterOptions={filterOptions}
        />

        <EditPromptDialogBox
          promptAction={promptAction}
          setPromptAction={setPromptAction}
          handleEditPrompt={handleEditPrompt}
          handleSavePrompt={handleSavePrompt}
          title={title}
          content={content}
          setTitle={setTitle}
          setContent={setContent}
          isLoading={isLoading}
        />
      </div>

      {savedPrompts.length === 0 ? (
        isLoading ? (
          <div className="flex w-full items-center justify-center pt-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 pt-20">
            No prompts saved yet
          </div>
        )
      ) : secondaryFilteredPrompts.length === 0 ? (
        <div className="flex items-center justify-center gap-2 pt-20">
          No match found
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-4">
          {secondaryFilteredPrompts.map((prompt) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0 }}
              whileHover={{
                scale: 1.01,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.99 }}
              className="hover_container flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3.5 text-left 
              transition-colors duration-200 hover:bg-primary/5"
            >
              <div className="flex w-full flex-row items-center justify-between text-base font-medium">
                <p>{prompt.title}</p>
                <div className="flex flex-row items-center">
                  <button
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                    onClick={() =>
                      handleAddToFavorites(prompt.id, !prompt.favorite)
                    }
                  >
                    <Star
                      className={`${!prompt.favorite && 'hover_content'} h-4 w-4`}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setPromptAction({
                        action: 'update',
                        id: prompt.id,
                      });
                      setTitle(prompt.title);
                      setContent(prompt.content);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPromptAction({
                        action: 'delete',
                        id: prompt.id,
                      })
                    }
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground/80">
                {prompt.content}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <DeleteDialogBox
        promptAction={promptAction}
        setPromptAction={setPromptAction}
        handleDeletePrompt={handleDeletePrompt}
      />
    </div>
  );
}
