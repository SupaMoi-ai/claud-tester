import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdventureEngine } from '../adventure/AdventureEngine';
import { getAdventure } from '../data/adventures';
import { useActions } from '../state/store';

export function AdventurePlay() {
  const navigate = useNavigate();
  const { id } = useParams();
  const actions = useActions();
  const adventure = getAdventure(id);

  if (!adventure) return <Navigate to="/verden" replace />;

  return (
    <AdventureEngine
      adventure={adventure}
      onFinish={() => {
        actions.completeAdventure(adventure.id, adventure.unlocks);
        navigate(`/eventyr/${adventure.id}/ferdig`, { replace: true });
      }}
      onLeave={() => navigate('/verden')}
    />
  );
}
