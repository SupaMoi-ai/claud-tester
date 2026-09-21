import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Shimmer, ShimmerLabel } from '../../components/Shimmer';
import { copy } from '../../copy';
import type { CapacityLevel, TabId, Task, TaskStep } from '../../domain/types';
import { askAI, type AIIntent, type AIResponse } from '../../mock/mockAI';

export interface AIRequest {
  intent: AIIntent;
  task?: Task;
}

const PROMPTS: Record<string, Array<{ intent: AIIntent; label: string }>> = {
  today: [
    { intent: 'what-first', label: copy.ai.promptsToday[0] },
    { intent: 'fifteen-minutes', label: copy.ai.promptsToday[1] },
    { intent: 'plan-afternoon', label: copy.ai.promptsToday[2] },
    { intent: 'what-forgetting', label: copy.ai.promptsToday[3] },
  ],
  brain: [
    { intent: 'make-easier', label: copy.ai.promptsBrain[0] },
    { intent: 'what-forgetting', label: copy.ai.promptsBrain[1] },
    { intent: 'move-non-urgent', label: copy.ai.promptsBrain[2] },
  ],
};

/**
 * The contextual helper. Quick prompts change per screen; "I can't start"
 * opens the same sheet already pointed at one task.
 */
export function AISheet({
  open,
  onOpenChange,
  request,
  screen,
  capacity,
  tasks,
  onKeepSteps,
  onMoveTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AIRequest | null;
  screen: TabId;
  capacity: CapacityLevel;
  tasks: Task[];
  onKeepSteps: (taskId: string, steps: TaskStep[]) => void;
  onMoveTask: (taskId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const task = request?.task;

  const run = useCallback(
    (intent: AIIntent, target?: Task) => {
      setLoading(true);
      setResponse(null);
      void askAI(intent, {
        screen,
        capacity,
        tasks,
        ...(target ? { task: target } : {}),
        now: new Date().toISOString(),
      }).then((answer) => {
        setResponse(answer);
        setLoading(false);
      });
    },
    [screen, capacity, tasks],
  );

  useEffect(() => {
    if (!open) {
      setResponse(null);
      setLoading(false);
      return;
    }
    if (request) run(request.intent, request.task);
  }, [open, request, run]);

  const prompts = PROMPTS[screen] ?? PROMPTS.today ?? [];

  // A quick prompt answers about a task without one being passed in, so the
  // answer names it. Resolve that task, or its actions would have nothing to
  // act on.
  const referenced = response?.taskIds?.[0]
    ? tasks.find((t) => t.id === response.taskIds?.[0])
    : undefined;
  const actionTask = task ?? referenced;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={response?.headline ?? (loading ? copy.ai.thinking : copy.ai.button)}
      subtitle={task?.title}
    >
      {loading ? (
        <div className="space-y-3">
          <ShimmerLabel text={copy.ai.thinking} />
          <Shimmer />
        </div>
      ) : null}

      {!loading && response ? (
        <div className="space-y-4">
          {response.body ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">
              {response.body}
            </p>
          ) : null}

          {response.steps && response.steps.length > 0 ? (
            <ol className="space-y-2">
              {response.steps.map((step, i) => (
                <li
                  key={`${step.text}-${i}`}
                  className="flex items-start gap-3 rounded-card bg-bg px-3 py-3"
                >
                  <span className="mt-0.5 shrink-0 rounded-chip bg-surface px-2 py-0.5 text-[12px] text-muted">
                    {copy.ai.stepLabel(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-[15px] leading-snug text-ink">
                    {step.text}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">
                    {copy.ai.stepMinutes(step.minutes)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          {response.actions && actionTask ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => run('even-easier', actionTask)}>{copy.ai.easier}</Button>
              <Button onClick={() => run('five-minute-version', actionTask)}>
                {copy.ai.fiveMinute}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  onMoveTask(actionTask.id);
                  onOpenChange(false);
                }}
              >
                {copy.ai.later}
              </Button>
            </div>
          ) : null}

          {response.steps && response.steps.length > 0 && actionTask ? (
            <Button
              variant="primary"
              full
              onClick={() => {
                onKeepSteps(
                  actionTask.id,
                  (response.steps ?? []).map((s): TaskStep => ({ ...s, done: false })),
                );
                onOpenChange(false);
              }}
            >
              {copy.ai.keepSteps}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !response ? (
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.intent}
              type="button"
              onClick={() => run(prompt.intent)}
              className="tap flex w-full items-center rounded-card border border-line bg-surface px-4 text-left text-[15px] text-ink transition-colors duration-200 hover:bg-sand/40"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      ) : null}

      {!loading && response ? (
        <button
          type="button"
          onClick={() => setResponse(null)}
          className="tap mt-4 w-full rounded-card px-4 text-[14px] text-muted transition-colors duration-200 hover:text-ink"
        >
          {copy.ai.askSomethingElse}
        </button>
      ) : null}
    </Sheet>
  );
}
