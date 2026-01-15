'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ReportStatusBadgeProps {
  status: 'open' | 'closed';
  editedAfterClose?: boolean;
}

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({
  status,
  editedAfterClose = false,
}) => {
  if (status === 'open') {
    return (
      <Badge className="bg-green-500 hover:bg-green-500 text-white">
        OTWARTY
      </Badge>
    );
  }

  if (editedAfterClose) {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">
        ZAMKNIĘTY (edytowany)
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-400 hover:bg-gray-400 text-white">
      ZAMKNIĘTY
    </Badge>
  );
};

export default ReportStatusBadge;
