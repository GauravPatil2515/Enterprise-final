import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, User, Tag, Paperclip, Flag } from 'lucide-react';
import type { Ticket, Priority, TicketStatus, Member } from '@/utils/mockData';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TicketModalProps {
  ticket?: Ticket;
  initialStatus?: TicketStatus;
  onClose: () => void;
  onSave: (ticket: Ticket) => void;
  mode: 'create' | 'edit' | 'view';
}

export const TicketModal = ({
  ticket,
  initialStatus = 'To Do',
  onClose,
  onSave,
  mode,
}: TicketModalProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [formData, setFormData] = useState<Partial<Ticket>>({
    title: ticket?.title || '',
    description: ticket?.description || '',
    priority: ticket?.priority || 'Medium',
    status: ticket?.status || initialStatus,
    assignee: ticket?.assignee,
    dueDate: ticket?.dueDate || new Date().toISOString().split('T')[0],
    labels: ticket?.labels || [],
    attachments: ticket?.attachments || 0,
    comments: ticket?.comments || 0,
  });

  const [labelInput, setLabelInput] = useState('');

  // Load members from API (not mock data)
  useEffect(() => {
    api.getMembers().then((m) => {
      setMembers(m);
      if (!formData.assignee && m.length > 0) {
        setFormData((prev) => ({ ...prev, assignee: m[0] }));
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTicket: Ticket = {
      id: ticket?.id || `TKT-${String(Date.now()).slice(-4)}`,
      title: formData.title!,
      description: formData.description!,
      priority: formData.priority as Priority,
      status: formData.status as TicketStatus,
      assignee: formData.assignee!,
      dueDate: formData.dueDate!,
      createdAt: ticket?.createdAt || new Date().toISOString(),
      labels: formData.labels!,
      attachments: formData.attachments!,
      comments: formData.comments!,
    };

    onSave(newTicket);
    onClose();
  };

  const addLabel = () => {
    if (labelInput.trim() && !formData.labels?.includes(labelInput.trim())) {
      setFormData({
        ...formData,
        labels: [...(formData.labels || []), labelInput.trim()],
      });
      setLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setFormData({
      ...formData,
      labels: formData.labels?.filter((l) => l !== label),
    });
  };

  const isViewMode = mode === 'view';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-atlassian-xl scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'Create Ticket' : mode === 'edit' ? 'Edit Ticket' : ticket?.id}
            </h2>
            {ticket && (
              <p className="text-sm text-muted-foreground">
                Created on {new Date(ticket.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter ticket title..."
              disabled={isViewMode}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue or task..."
              rows={4}
              disabled={isViewMode}
            />
          </div>

          {/* Grid of selects */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assignee
              </Label>
              <Select
                value={formData.assignee?.id}
                onValueChange={(value) => {
                  const member = members.find((m) => m.id === value);
                  if (member) setFormData({ ...formData, assignee: member });
                }}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={formData.assignee?.avatar} />
                        <AvatarFallback>{formData.assignee?.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {formData.assignee?.name}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Labels
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.labels?.map((label) => (
                <span
                  key={label}
                  className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                >
                  {label}
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!isViewMode && (
              <div className="flex gap-2">
                <Input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Add a label..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                />
                <Button type="button" variant="outline" onClick={addLabel}>
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isViewMode && (
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {mode === 'create' ? 'Create Ticket' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};
