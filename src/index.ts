/**
 * HideMessages — Pyoncord / ShiggyCord Plugin
 * Ported from Vencord/Equicord by yash
 *
 * Temporarily hides messages from view until the app is restarted.
 */

import { instead } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { React } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";

// Defaults
storage.enabled ??= true;

// Find Discord's flux dispatcher
const FluxDispatcher = findByProps("dispatch", "subscribe", "unsubscribe");

// Find the message long-press action registry
const MessageLongPressActionModule = findByProps("registerMessageLongPressAction") 
    ?? findByProps("addMessageContextOption");

/**
 * Dispatches a local MESSAGE_DELETE.
 * Nothing is deleted server-side — message returns after app restart.
 */
function hideMessage(messageId, channelId) {
    FluxDispatcher.dispatch({
        type: "MESSAGE_DELETE",
        id: messageId,
        channelId: channelId,
        mlDeleted: true,
    });
    showToast("Message hidden until restart.");
}

let unpatch = null;

export default {
    onLoad() {
        if (!storage.enabled) return;

        if (MessageLongPressActionModule?.registerMessageLongPressAction) {
            // Pyoncord / ShiggyCord path
            unpatch = MessageLongPressActionModule.registerMessageLongPressAction({
                id: "hide-message",
                label: "Hide Message",
                action: ({ message }) => {
                    hideMessage(message.id, message.channel_id);
                },
            });
        } else {
            // Fallback: patch whatever long-press sheet builder is available
            const ActionSheetModule = findByProps("openLazy", "hideActionSheet")
                ?? findByProps("ActionSheet");

            const MessageActionSheet = findByProps(
                "handleMessageLongPress",
                "MessageContextMenu"
            );

            if (MessageActionSheet) {
                unpatch = after(
                    "handleMessageLongPress",
                    MessageActionSheet,
                    ([{ message }], res) => {
                        if (!storage.enabled) return res;

                        // Inject our option into the resolved action list
                        if (Array.isArray(res?.props?.children)) {
                            res.props.children.push(
                                React.createElement(
                                    findByProps("PressableScale") ?? "Pressable",
                                    {
                                        key: "hide-message",
                                        onPress: () => {
                                            hideMessage(message.id, message.channel_id);
                                            ActionSheetModule?.hideActionSheet?.();
                                        },
                                        style: { padding: 12 },
                                    },
                                    React.createElement(
                                        findByProps("Text") ?? "Text",
                                        { style: { color: "#fff" } },
                                        "Hide Message"
                                    )
                                )
                            );
                        }
                        return res;
                    }
                );
            }
        }
    },

    onUnload() {
        unpatch?.();
        unpatch = null;
    },

    settings: {
        enabled: {
            type: "toggle",
            label: "Enable Hide Message",
            description: "Show 'Hide Message' in the long-press action sheet.",
            default: true,
            onChange: (v) => { storage.enabled = v; },
        },
    },
};
