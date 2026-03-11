"use client";

import React from "react";
import { FollowList } from "../profile/FollowList";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkeys: string[];
  title: string;
  loading?: boolean;
}

export const UserListModal: React.FC<UserListModalProps> = ({ 
  isOpen, 
  onClose, 
  pubkeys, 
  title,
  loading = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 gap-0 sm:max-w-md h-[70vh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="font-black text-xl">{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <FollowList 
            pubkeys={pubkeys} 
            loading={loading}
            emptyMessage="No users found."
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
