import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
const buttonVariants=cva('inline-flex items-center justify-center disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',{
 variants:{variant:{default:'rounded-md bg-primary text-primary-foreground px-4 py-2',ghost:'rounded-md hover:bg-white/10 px-4 py-2',unstyled:''}},defaultVariants:{variant:'default'}
});
export function Button({className,variant,asChild=false,...props}:React.ComponentProps<'button'>&VariantProps<typeof buttonVariants>&{asChild?:boolean}){const Comp=asChild?Slot:'button';return <Comp data-slot="button" className={cn(buttonVariants({variant,className}))} {...props}/>;}
