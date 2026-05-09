import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function trimString(str: string, maxLength: number) {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}