import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

type HelpTooltipProps = {
  title: string;
  placement?: "top" | "bottom" | "left" | "right";
  size?: "small" | "medium";
};

/** Small, accessible help marker for explaining an action or field. */
export default function HelpTooltip({
  title,
  placement = "top",
  size = "small",
}: HelpTooltipProps) {
  if (!title?.trim()) return null;

  return (
    <Tooltip
      title={title}
      placement={placement}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={3500}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 280,
            px: 1.5,
            py: 1,
            fontSize: 12,
            lineHeight: 1.55,
            whiteSpace: "normal",
          },
        },
      }}
    >
      <IconButton
        size={size}
        aria-label={`Trợ giúp: ${title}`}
        sx={{
          width: 25,
          height: 25,
          ml: 0.25,
          color: "#64748b",
          flexShrink: 0,
          "&:hover": { color: "#2563eb", backgroundColor: "rgba(37,99,235,.08)" },
        }}
      >
        <HelpOutlineRoundedIcon sx={{ fontSize: 17 }} />
      </IconButton>
    </Tooltip>
  );
}
