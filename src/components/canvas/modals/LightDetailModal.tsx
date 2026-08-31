import React from 'react';
import { Lightbulb } from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';
import LightControlView from '../../modals/entity-controls/LightControlView';
import { detectLightCapabilities } from '../../../services/lightClassification';

interface LightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity?: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function LightDetailModal({
  isOpen,
  onClose,
  entity
}: LightDetailModalProps) {
  const caps = detectLightCapabilities(entity);
  const isOn = caps.isOn;
  const title = entity.attributes?.friendly_name || 'Light Controls';

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={entity.entity_id}
      icon={<Lightbulb size={22} weight="duotone" className={isOn ? 'text-amber-400' : 'text-slate-400'} />}
    >
      <LightControlView entity={entity} />
    </CardModalContainer>
  );
}
