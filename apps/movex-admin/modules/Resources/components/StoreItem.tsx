import { githubLightTheme, JsonEditor } from 'json-edit-react';
import { MovexStoreItem } from 'movex-store';
import { useState } from 'react';

type Props = {
  item: MovexStoreItem<unknown>;
};

export const StoreItem = ({ item }: Props) => {
  const [expand, setExpand] = useState<boolean>();
  const [state, checksum] = item.state;

  return (
    <div className="bg-slate-200 mb-3">
      <div
        className={`p-3 flex flex-1 space-between hover:bg-slate-300 hover:cursor-pointer ${
          expand && 'bg-slate-300'
        }`}
        onClick={() => setExpand((prev) => !prev)}
      >
        <span className="">{item.rid}</span>
        <div className="flex flex-1 justify-end gap-3 text-sm">
          <span>Checksum: {checksum}</span>

          {item.createdAt && (
            <span>
              Updated At {new Date(item.createdAt).toLocaleDateString()}
            </span>
          )}

          {item.createdAt && (
            <span>
              Created At {new Date(item.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {expand && (
        <div className="p-3 flex bg-slate-200">
          <div className="flex-1">
            <div className="pb-2 font-bold">Subscribers</div>
            <>
              {item.subscribers && (
                <JsonEditor
                  data={item.subscribers}
                  rootName="subscribers"
                  theme={githubLightTheme}
                  restrictEdit
                  restrictAdd
                  restrictDelete
                  restrictDrag
                  restrictTypeSelection
                  enableClipboard
                />
              )}
            </>
          </div>
          <div className="flex-1">
            <div className="pb-2 font-bold">State</div>
            <>
              {state && (
                <JsonEditor
                  data={state}
                  rootName="state"
                  theme={githubLightTheme}
                  restrictEdit
                  restrictAdd
                  restrictDelete
                  restrictDrag
                  restrictTypeSelection
                  enableClipboard
                />
              )}
            </>
          </div>
        </div>
      )}
    </div>
  );
};
