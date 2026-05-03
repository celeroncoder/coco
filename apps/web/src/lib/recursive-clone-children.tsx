import * as React from "react";

export function recursiveCloneChildren(
  children: React.ReactNode,
  newProps: Record<string, unknown>,
  targetIds: string[],
  uniqueId: string,
  asChild?: boolean,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    const childType = child.type as { displayName?: string };
    const isTarget =
      typeof child.type !== "string" &&
      targetIds.includes(childType?.displayName ?? "");

    const newChildren = recursiveCloneChildren(
      (child.props as { children?: React.ReactNode }).children,
      newProps,
      targetIds,
      uniqueId,
      asChild,
    );

    if (isTarget) {
      return React.cloneElement(
        child as React.ReactElement<Record<string, unknown>>,
        { ...newProps, key: `${uniqueId}-${Math.random()}` },
        newChildren,
      );
    }

    return React.cloneElement(
      child as React.ReactElement<Record<string, unknown>>,
      child.props as Record<string, unknown>,
      newChildren,
    );
  });
}
