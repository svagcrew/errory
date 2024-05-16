import cloneDeep from 'lodash/cloneDeep.js'

const httpStatuses = {
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLYHINTS: 103,
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  AMBIGUOUS: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  REQUESTED_RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  I_AM_A_TEAPOT: 418,
  MISDIRECTED: 421,
  UNPROCESSABLE_ENTITY: 422,
  FAILED_DEPENDENCY: 424,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
}

// TODO: headless trpc integration
// TODO: fix stack trace
// TODO: add tests

const toHttpStatus = (status: number | string) => {
  if (typeof status === 'string') {
    return status in httpStatuses
      ? httpStatuses[status as keyof typeof httpStatuses]
      : httpStatuses.INTERNAL_SERVER_ERROR
  } else {
    return status
  }
}

const isArraysOverlaps = <T>(arr1: T[], arr2: T[]) => {
  return arr1.some((item) => arr2.includes(item))
}

type CodeDefinition = {
  message?: string
  httpStatus?: number | keyof typeof httpStatuses
  expected?: boolean
  meta?: Record<string, any>
}
type CreateErroryInput<TCode extends string> = {
  availableCodes?: TCode[]
  expectedCodes?: TCode[]
  unexpectedCodes?: TCode[]
  codesDefinition?: Record<TCode, CodeDefinition>
  defaultMessage?: string
  defaultHttpStatus?: number | keyof typeof httpStatuses
  defaultExpected?: boolean
  defaultMeta?: Record<string, any>
  defaultTag?: string
}

type ErroryInput<TCode extends string> = {
  message?: string | undefined
  cause?: any
  code?: TCode
  codes?: TCode[]
  tag?: string
  tags?: string[]
  httpStatus?: number | keyof typeof httpStatuses
  expected?: boolean
  meta?: Record<string, any>
}
type ErroryInputWithoutMessage<TCode extends string> = Omit<ErroryInput<TCode>, 'message'>
type ErroryArgs<TCode extends string> =
  | [ErroryInput<TCode>]
  | []
  | [string | undefined]
  | [string | undefined, ErroryInputWithoutMessage<TCode>]

const parseInputWithDefaultMessage = (args: ErroryArgs<any>, defaultMessage: string) => {
  if (args.length === 0) {
    return { message: defaultMessage }
  } else if (args.length === 1) {
    if (typeof args[0] === 'string' || typeof args[0] === 'undefined') {
      return { message: args[0] || defaultMessage }
    } else {
      return args[0]
    }
  } else {
    return { message: args[0] || defaultMessage, ...args[1] }
  }
}

export const createErroryThings = <TCode extends string>(createInput?: CreateErroryInput<TCode>) => {
  const availableCodes = createInput?.availableCodes || []
  const expectedCodes = createInput?.expectedCodes || []
  const unexpectedCodes = createInput?.unexpectedCodes || []
  const codesDefinition = createInput?.codesDefinition || ({} as Record<TCode, CodeDefinition>)
  const defaultMessageGlobal = createInput?.defaultMessage || 'Unknown error'
  const defaultHttpStatusGlobal = createInput?.defaultHttpStatus || httpStatuses.INTERNAL_SERVER_ERROR
  const defaultExpectedGlobal = createInput?.defaultExpected || false
  const defaultMetaGlobal = createInput?.defaultMeta || {}
  const defaultTagGlobal = createInput?.defaultTag || 'unknown'

  class Errory extends Error {
    constructor()
    constructor(message: string | undefined)
    constructor(input: ErroryInput<TCode>)
    constructor(message: string | undefined, input: ErroryInputWithoutMessage<TCode>)
    constructor(...args: ErroryArgs<TCode>) {
      const input = parseInputWithDefaultMessage(args, defaultMessageGlobal)
      super(input.message)
      this.cause = input.cause
      const causeErrory = input.cause instanceof Errory ? input.cause : null

      const exCodes = causeErrory?.codes || []
      this.code = input.code || causeErrory?.code || unexpectedCodes[0] || allAvailableCodes[0]
      this.codes = [...new Set([this.code, ...(input.codes || []), ...exCodes])]
      const exTags = causeErrory?.tags || []
      this.tag = input.tag || this.tags[0] || defaultTagGlobal
      this.tags = [...new Set([this.tag, ...(input.tags || []), ...exTags])]

      const defaultMessage = this.message
      this.message = input.message || defaultMessage
      const exMessages = causeErrory?.messages || []
      this.messages = [this.message, ...exMessages]
      const defaultHttpStatus = this.httpStatus
      const exHttpStatus = causeErrory?.httpStatus
      this.httpStatus = (input.httpStatus && toHttpStatus(input.httpStatus)) || exHttpStatus || defaultHttpStatus
      const defaultExpected = this.expected
      const exExpected = causeErrory?.expected
      this.expected =
        typeof input.expected === 'boolean'
          ? input.expected
          : typeof exExpected === 'boolean'
            ? exExpected
            : defaultExpected
      const defaultMeta = this.meta
      this.meta = { ...defaultMeta, ...input.meta }
      const exStack = this.cause?.stack
      // const thisStack = this.stack?.split('\n').slice(0, 2).join('\n') || null
      const thisStack = this.stack?.split('\n').join('\n') || null
      this.stack = [thisStack, exStack].filter(Boolean).join('\n')
    }

    cause?: any
    message: string = defaultMessageGlobal
    messages: string[] = []
    code: TCode
    codes: TCode[] = []
    tag: string
    tags: string[] = []
    httpStatus: number = httpStatuses.INTERNAL_SERVER_ERROR
    expected: boolean = defaultExpectedGlobal
    meta: Record<string, any> = defaultMetaGlobal
    onlyErroriesHaveThisProperty = true
  }

  class ErroryExpected extends Errory {
    expected = true
  }

  class ErroryUnexpected extends Errory {
    expected = false
  }

  const allAvailableCodes = [...new Set([...availableCodes, ...unexpectedCodes, ...expectedCodes])]
  const classesByAvailableCodes = allAvailableCodes.reduce((acc, code) => {
    return {
      ...acc,
      [`Errory${code[0].toUpperCase() + code.slice(1)}`]: class extends Errory {
        code = code
        expected = !isArraysOverlaps([code], unexpectedCodes)
          ? false
          : isArraysOverlaps([code], expectedCodes)
            ? true
            : defaultExpectedGlobal
      },
    }
  }, {}) as Record<`Errory${Capitalize<TCode>}`, typeof Errory>

  const classesByCodesDefinition = Object.entries(codesDefinition).reduce((acc, codeAndDefinition) => {
    const [code, definition] = codeAndDefinition as [TCode, CodeDefinition]
    return {
      ...acc,
      [`Errory${code[0].toUpperCase() + code.slice(1)}`]: class extends Errory {
        code = code
        message = definition.message || defaultMessageGlobal
        httpStatus = toHttpStatus(definition.httpStatus || defaultHttpStatusGlobal)
        expected = definition.expected || defaultExpectedGlobal
        meta = { ...defaultMetaGlobal, ...definition.meta }

        constructor(...args: ErroryArgs<TCode>) {
          const input = parseInputWithDefaultMessage(args, definition.message || defaultMessageGlobal)
          super(input.message)
        }
      },
    }
  }, {}) as Record<`Errory${Capitalize<TCode>}`, typeof Errory>

  const toErrory = (error: any): InstanceType<typeof Errory> => {
    if (error instanceof Errory) {
      return error
    }
    if ('onlyErroriesHaveThisProperty' in error) {
      return new Errory({
        message: error.message,
        cause: error.cause,
        code: error.code,
        codes: error.codes,
        httpStatus: error.httpStatus,
        expected: error.expected,
        meta: error.meta,
      })
    }
    // for trpc errors
    if (typeof error.data === 'object' && error.data !== null && 'onlyErroriesHaveThisProperty' in error.data) {
      return toErrory(error.data)
    }
    return new Errory({
      message: error.message,
      cause: error,
    })
  }

  return {
    toErrory,
    Errory,
    ErroryExpected,
    ErroryUnexpected,
    ...classesByAvailableCodes,
    ...classesByCodesDefinition,
  }
}

export const prepareErroryDataForHumanLogging = <T>(data: T): T => {
  const result: any = cloneDeep(data)
  if (result?.codes?.length > 1) {
    delete result?.code
  } else {
    delete result?.codes
  }
  if (result?.tags?.length > 1) {
    delete result?.tag
  } else {
    delete result?.tags
  }
  if (result?.messages?.length <= 1) {
    delete result?.messages
  }
  delete result?.onlyErroriesHaveThisProperty
  return result
}

export type ToErroryType<T extends string = string> = ReturnType<typeof createErroryThings<T>>['toErrory']
export type ErroryType<T extends string = string> = ReturnType<typeof createErroryThings<T>>['Errory']
export type ErroryInstanceType<T extends string = string> = InstanceType<
  ReturnType<typeof createErroryThings<T>>['Errory']
>
