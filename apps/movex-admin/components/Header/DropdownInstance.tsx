import {
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { objectKeys } from 'movex-core-util';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useCookie from 'react-use-cookie';

type InstanceRecord = {
  active?: string;
  urls: Record<string, string>;
};

export const DropdownInstance = () => {
  const [cookie, setCookie, removeCookie] = useCookie(
    'movex-instances',
    JSON.stringify({
      urls: {},
    })
  );

  const instancesRecord = useMemo<InstanceRecord>(
    () => JSON.parse(cookie),
    [cookie]
  );

  const setInstances = useCallback(
    (next: InstanceRecord | ((prev: InstanceRecord) => InstanceRecord)) => {
      setCookie(
        JSON.stringify(
          typeof next === 'function' ? next(instancesRecord) : next
        )
      );

      // This shouldn't be here but it's fine for now
      window.location.reload();
    },
    [instancesRecord, setCookie]
  );

  // useEffect(() => {
  //   // window.location.reload()
  //   console.log('instancesRecord.active', instancesRecord.active);
  // }, [instancesRecord.active])

  const [dialogModel, setDialogModel] = useState({ url: '' });

  return (
    <Dialog.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="soft">
            {instancesRecord.active || 'Add Movex Instance'}
            <DropdownMenu.TriggerIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {objectKeys(instancesRecord.urls)
            .filter((url) => instancesRecord.active !== url)
            .map((url) => (
              <DropdownMenu.Item
                key={url}
                onClick={() => {
                  setInstances((prev) => ({
                    ...prev,
                    urls: {
                      ...prev?.urls,
                    },
                    active: url,
                  }));
                }}
              >
                {url}
              </DropdownMenu.Item>
            ))}
          <DropdownMenu.Separator />
          <DropdownMenu.Item>
            <Dialog.Trigger>
              <Button>Add New</Button>
            </Dialog.Trigger>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Add Movex Instance</Dialog.Title>

        <Flex direction="column" gap="3">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Endpoint Url
            </Text>
            <TextField.Root
              defaultValue=""
              placeholder="https://..."
              onChange={(e) =>
                setDialogModel((prev) => ({ ...prev, url: e.target.value }))
              }
            />
          </label>
          {/* <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Email
              </Text>
              <TextField.Root
                defaultValue="freja@example.com"
                placeholder="Enter your email"
              />
            </label> */}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              onClick={() => setDialogModel({ url: '' })}
            >
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button
              onClick={() => {
                if (dialogModel.url.length > 0) {
                  setInstances((prev) => ({
                    // ...prev,
                    active: dialogModel.url,
                    urls: {
                      ...prev?.urls,
                      [dialogModel.url]: dialogModel.url,
                    },
                  }));
                }
              }}
            >
              Save
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
