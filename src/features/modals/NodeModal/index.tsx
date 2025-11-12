import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Textarea, Group, Button } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;
  const obj: Record<string, any> = {};
  nodeRows.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

function parsePath(p: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  const re = /\["([^"]+)"\]|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(p))) tokens.push(m[1] !== undefined ? m[1] : Number(m[2]));
  return tokens;
}
function getAtPath(root: any, path: string) {
  const keys = parsePath(path);
  let cur = root;
  for (const k of keys) cur = cur?.[k];
  return cur;
}

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const jsonPath = jsonPathToString(nodeData?.path);
  const initial = normalizeNodeData(nodeData?.text ?? []);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(initial);

  React.useEffect(() => {
    setDraft(initial);
    setIsEditing(false);
  }, [initial, opened]);

  const updateAtPath = useJson(state => state.updateAtPath);
  const getJson = useJson(state => state.getJson);

  const onEdit = () => setIsEditing(true);
  const onCancel = () => {
    setDraft(initial);
    setIsEditing(false);
  };
  const onSave = () => {
    try {
      const parsed = JSON.parse(draft);
      const root = JSON.parse(getJson());
      const current = getAtPath(root, jsonPath);
      const next =
        current && typeof current === "object" && !Array.isArray(current) && typeof parsed === "object" && !Array.isArray(parsed)
          ? { ...current, ...parsed }
          : parsed;
      updateAtPath(jsonPath, next);
      setIsEditing(false);
    } catch {
      alert("Invalid JSON. Please fix and try again.");
    }
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>Content</Text>
            <CloseButton onClick={onClose} />
          </Flex>

          {isEditing ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              autosize
              minRows={8}
              maxRows={16}
              styles={{ input: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
            />
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight code={initial} miw={350} maw={600} language="json" withCopyButton />
            </ScrollArea.Autosize>
          )}
        </Stack>

        <Text fz="xs" fw={500}>JSON Path</Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPath}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>

        <Group justify="end" mt="xs">
          {!isEditing && <Button variant="default" onClick={onEdit}>Edit</Button>}
          {isEditing && (
            <>
              <Button onClick={onSave}>Save</Button>
              <Button variant="default" onClick={onCancel}>Cancel</Button>
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};
