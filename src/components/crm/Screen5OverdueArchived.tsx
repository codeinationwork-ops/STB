import React from 'react';
import { Screen5OrdersManager } from './Screen5OrdersManager';
import { TailorOrder, OrderStatus } from '../../types';

interface Screen5OverdueArchivedProps {
  orders: TailorOrder[];
  onBack: () => void;
  onSelectOrder: (order: TailorOrder) => void;
  onArchiveOrder: (orderId: string) => void;
  onUnarchiveOrder?: (orderId: string) => void;
  onExtendDueDate: (orderId: string, newDate: string) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onNewOrderClick?: () => void;
  initialTab?: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived';
  isDesktopView?: boolean;
}

export const Screen5OverdueArchived: React.FC<Screen5OverdueArchivedProps> = (props) => {
  return <Screen5OrdersManager {...props} initialTab={props.initialTab || 'overdue'} />;
};
