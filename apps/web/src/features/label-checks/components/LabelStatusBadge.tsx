import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, FolderX, FileX } from 'lucide-react';
import { RESULT_STATUS_CONFIG, type LabelCheckResultStatus } from '../types';

interface Props {
  status: LabelCheckResultStatus;
}

export function LabelStatusBadge({ status }: Props) {
  const config = RESULT_STATUS_CONFIG[status];

  const icons = {
    check: CheckCircle,
    x: XCircle,
    'alert-triangle': AlertTriangle,
    'folder-x': FolderX,
    'file-x': FileX,
  };

  const Icon = icons[config.icon];

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Badge variant="outline" className={colorClasses[config.color]}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
