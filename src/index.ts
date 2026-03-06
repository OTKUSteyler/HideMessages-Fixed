import { findByProps } from "@metro/utils";
import { after } from "@patcher";
import { definePlugin } from "@utils/types";
import { ReactNative as RN } from "@metro/common";
import { useProxy } from "@lib/storage";
import { storage } from "@lib/storage";
import { showToast } from "@lib/ui/toasts";
import { Forms } from "@lib/ui/components";

const { FormSwitchRow, FormSection } = Forms;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
storage.hideEnabled ??= true;

// ---------------------------------------------------------------------------
// Core logic — local MESSAGE_DELETE, nothing server-side
// ---------------------------------------------------------------------------
const FluxDispatcher = findByProps("dispatch", "_currentDispatchActionType");

function hideMessage(messageId: string, channelId: string) {
    FluxDispatcher.dispatch({
        type: "MESSAGE_DELETE",
        id: messageId,
        channelId,
        mlDeleted: true,
    });
    showToast("Message hidden until restart.");
}

// ---------------------------------------------------------------------------
// Context menu patch — Bunny/Kettu style
// The `contextMenus` field is the correct way to patch long-press menus.
// Key: "message" matches the MessageContextMenu sheet shown on long-press.
// ---------------------------------------------------------------------------
export default definePlugin({
    name: "HideMessages",
    description: "Temporarily hide a message from view until you restart the app.",
    authors: [{ name: "yash", id: "0" }],

    // This is the Bunny/Kettu equivalent of Vencord's contextMenus field.
    // It receives (children, props) just like NavContextMenuPatchCallback.
    contextMenus: {
        message(children: any[], props: { message: any }) {
            if (!storage.hideEnabled) return;
            if (!props?.message) return;

            const { message } = props;

            // Find the group containing "copy-text" and splice in after it,
            // falling back to pushing at end if not found.
            let inserted = false;
            for (const group of children) {
                const items: any[] = group?.props?.children;
                if (!Array.isArray(items)) continue;

                const idx = items.findIndex((c: any) => c?.props?.id === "copy-text");
                if (idx !== -1) {
                    items.splice(idx + 1, 0, {
                        // Plain action object — Bunny renders these natively
                        key: "hide-message",
                        id: "hide-message",
                        label: "Hide Message",
                        action: () => hideMessage(message.id, message.channel_id),
                    });
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                // Fallback: push to last group
                const lastGroup = children[children.length - 1];
                const items = lastGroup?.props?.children;
                if (Array.isArray(items)) {
                    items.push({
                        key: "hide-message",
                        id: "hide-message",
                        label: "Hide Message",
                        action: () => hideMessage(message.id, message.channel_id),
                    });
                }
            }
        },
    },

    // Settings screen — must be a React component function for Bunny/Kettu
    settings() {
        const proxy = useProxy(storage);
        return (
            <FormSection title="HideMessages">
                <FormSwitchRow
                    label="Enable Hide Message"
                    subLabel="Show 'Hide Message' in the long-press action sheet."
                    value={proxy.hideEnabled}
                    onValueChange={(v: boolean) => { proxy.hideEnabled = v; }}
                />
            </FormSection>
        );
    },
});
